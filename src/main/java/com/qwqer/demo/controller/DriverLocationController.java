package com.qwqer.demo.controller;

import com.enums.VehicleCapacity;
import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.entity.DeliveryAgent.AgentStatus;
import com.qwqer.demo.entity.Product;
import com.qwqer.demo.entity.Warehouse;
import com.qwqer.demo.enums.OrderStatus;
import com.qwqer.demo.repository.CustomerOrderRepository;
import com.qwqer.demo.repository.DeliveryAgentRepository;
import com.qwqer.demo.repository.ProductRepository;
import com.qwqer.demo.repository.WarehouseRepository;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Controller
public class DriverLocationController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DeliveryAgentRepository agentRepository;
    private final Random random = new Random();
    private final CustomerOrderRepository orderRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DriverLocationController.class);

    // 🧭 Mutable Map to track updated driver positions (no more
    // ImmutableCollections issue)
    private final Map<Long, Map<String, Object>> driverLocations = new HashMap<>();

    public DriverLocationController(SimpMessagingTemplate messagingTemplate,
            DeliveryAgentRepository agentRepository,
            CustomerOrderRepository orderRepository, WarehouseRepository warehouseRepository,
            ProductRepository productRepository) {
        this.messagingTemplate = messagingTemplate;
        this.agentRepository = agentRepository;
        this.orderRepository = orderRepository;
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
    }

    @Scheduled(fixedRate = 10000)
    @Transactional
    public void autoAssignDrivers() {
        List<CustomerOrder> pendingOrders = orderRepository.findByStatus(OrderStatus.PENDING_ASSIGNMENT);
        if (pendingOrders.isEmpty()) {
            log.debug("⏸ No pending orders found — skipping this cycle.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        log.info("🕐 Checking {} pending orders for assignment...", pendingOrders.size());

        // ✅ Only process orders older than 30 seconds
        List<CustomerOrder> eligibleOrders = pendingOrders.stream()
                .filter(o -> Duration.between(o.getCreatedAt(), now).getSeconds() >= 30)
                .collect(Collectors.toList());

        if (eligibleOrders.isEmpty()) {
            log.info("⏱ All pending orders are too new (<30s). Waiting for next cycle.");
            return;
        }

        for (CustomerOrder order : eligibleOrders) {
            final Warehouse warehouse = (order.getWarehouseId() != null)
                    ? warehouseRepository.findById(order.getWarehouseId()).orElse(null)
                    : null;
            if (warehouse == null || warehouse.getLatitude() == null || warehouse.getLongitude() == null) {
                log.warn("⚠ Skipping order {} — missing valid warehouse/location data.", order.getId());
                continue;
            }

            // ⚖️ Compute weight and required capacity
            double orderWeightKg = calculateOrderWeight(order);
            VehicleCapacity requiredCapacity = (orderWeightKg < 0.4) ? VehicleCapacity.TWO_WHEELER
                    : VehicleCapacity.FOUR_WHEELER;

            log.info("📦 Order {} → Weight: {} kg, Required: {}", order.getId(),
                    String.format("%.2f", orderWeightKg), requiredCapacity);

            // 🧭 Find other nearby orders (within 3 km + within ±30s)
            List<CustomerOrder> nearbyOrders = eligibleOrders.stream()
                    .filter(o -> !o.equals(order))
                    .filter(o -> o.getLatitude() != null && o.getLongitude() != null)
                    .filter(o -> Duration.between(o.getCreatedAt(), order.getCreatedAt()).abs().getSeconds() <= 30)
                    .filter(o -> distance(order.getLatitude(), order.getLongitude(),
                            o.getLatitude(), o.getLongitude()) <= 3.0)
                    .filter(o -> {
                        double w = calculateOrderWeight(o);
                        return (requiredCapacity == VehicleCapacity.TWO_WHEELER && w < 0.4)
                                || (requiredCapacity == VehicleCapacity.FOUR_WHEELER && w >= 0.4);
                    })
                    .collect(Collectors.toList());
            nearbyOrders.add(order);

            double totalWeightKg = calculateTotalWeight(nearbyOrders);
            log.info("📍 Order {} → {} nearby orders found (total {} kg)",
                    order.getId(), nearbyOrders.size() - 1, String.format("%.2f", totalWeightKg));

            // ♻️ Step 1: Try reusing a driver who’s already ASSIGNED nearby
            List<CustomerOrder> activeAssigned = orderRepository.findByStatus(OrderStatus.ASSIGNED);
            DeliveryAgent reusableDriver = activeAssigned.stream()
                    .map(CustomerOrder::getDeliveryAgent)
                    .filter(Objects::nonNull)
                    .filter(a -> a.getStatus() == AgentStatus.ASSIGNED)
                    .filter(a -> a.getVehicleCapacity() == requiredCapacity)
                    .filter(a -> a.getLatitude() != null && a.getLongitude() != null)
                    .filter(a -> distance(a.getLatitude(), a.getLongitude(),
                            warehouse.getLatitude(), warehouse.getLongitude()) <= 3.0)
                    .findFirst()
                    .orElse(null);

            if (reusableDriver != null) {
                // Only reuse if 30+ seconds passed since that driver's original order was
                // created
                CustomerOrder firstAssignedOrder = activeAssigned.stream()
                        .filter(o -> o.getDeliveryAgentId() != null
                                && o.getDeliveryAgentId().equals(reusableDriver.getId()))
                        .min(Comparator.comparing(CustomerOrder::getCreatedAt))
                        .orElse(null);

                if (firstAssignedOrder != null &&
                        Duration.between(firstAssignedOrder.getCreatedAt(), now).getSeconds() >= 30) {
                    for (CustomerOrder o : nearbyOrders) {
                        o.setDeliveryAgentId(reusableDriver.getId());
                        o.setStatus(OrderStatus.ASSIGNED);
                        orderRepository.save(o);
                    }
                    log.info("♻️ Reused driver '{}' [{}] for nearby orders {} | Vehicle={} | TotalWeight={} kg",
                            reusableDriver.getName(),
                            reusableDriver.getStatus(),
                            nearbyOrders.stream().map(CustomerOrder::getId).toList(),
                            reusableDriver.getVehicleCapacity(),
                            String.format("%.2f", totalWeightKg));
                    continue;
                }
            }

            // 🚗 Step 2: Assign a NEW available driver (if reuse not possible)
            List<DeliveryAgent> availableAgents = agentRepository.findByStatus(AgentStatus.AVAILABLE);
            List<DeliveryAgent> matchingAgents = availableAgents.stream()
                    .filter(a -> a.getVehicleCapacity() != null && a.getVehicleCapacity().equals(requiredCapacity))
                    .filter(a -> a.getLatitude() != null && a.getLongitude() != null)
                    .collect(Collectors.toList());

            if (matchingAgents.isEmpty()) {
                log.warn("🚫 No available {} drivers for order {} (totalWeight {} kg)",
                        requiredCapacity, order.getId(), String.format("%.2f", totalWeightKg));
                continue;
            }

            DeliveryAgent nearest = matchingAgents.stream()
                    .min(Comparator.comparingDouble(a -> distance(a.getLatitude(), a.getLongitude(),
                            warehouse.getLatitude(), warehouse.getLongitude())))
                    .orElse(null);

            if (nearest == null)
                continue;

            // Assign driver to all grouped orders
            for (CustomerOrder o : nearbyOrders) {
                o.setDeliveryAgentId(nearest.getId());
                o.setStatus(OrderStatus.ASSIGNED);
                orderRepository.save(o);
            }

            nearest.setStatus(AgentStatus.ASSIGNED);
            nearest.setAssignedOrderId(order.getId());
            agentRepository.save(nearest);

            log.info("✅ Assigned NEW driver '{}' [{}] to orders {} | Vehicle={} | TotalWeight={} kg | Dist={} km",
                    nearest.getName(),
                    nearest.getStatus(),
                    nearbyOrders.stream().map(CustomerOrder::getId).toList(),
                    nearest.getVehicleCapacity(),
                    String.format("%.2f", totalWeightKg),
                    String.format("%.2f", distance(nearest.getLatitude(), nearest.getLongitude(),
                            warehouse.getLatitude(), warehouse.getLongitude())));
        }
    }

    private double calculateOrderWeight(CustomerOrder o) {
        Product p = productRepository.findById(o.getProductId()).orElse(null);
        if (p == null || p.getWeight() == null)
            return 0;
        return (p.getWeight() / 1000.0) * o.getQuantity(); // g → kg
    }

    public double distance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private double calculateTotalWeight(List<CustomerOrder> orders) {
        return orders.stream()
                .mapToDouble(o -> {
                    Product p = productRepository.findById(o.getProductId()).orElse(null);
                    if (p == null || p.getWeight() == null)
                        return 0;
                    return (p.getWeight() / 1000.0) * o.getQuantity(); // grams → kg
                })
                .sum();
    }

}
