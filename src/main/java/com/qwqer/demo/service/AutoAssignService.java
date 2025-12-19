package com.qwqer.demo.service;

import com.qwqer.demo.entity.Product;
import com.qwqer.demo.entity.Warehouse;
import com.qwqer.demo.entity.DeliveryAgent.AgentStatus;
import com.qwqer.demo.enums.OrderStatus;
import com.enums.VehicleCapacity;
import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.repository.ProductRepository;
import com.qwqer.demo.repository.WarehouseRepository;
import com.qwqer.demo.repository.CustomerOrderRepository;
import com.qwqer.demo.repository.DeliveryAgentRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AutoAssignService {

    private final CustomerOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final DeliveryAgentRepository agentRepository;
    private final WarehouseRepository warehouseRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AutoAssignService.class);

    public AutoAssignService(CustomerOrderRepository orderRepository,
            ProductRepository productRepository,
            DeliveryAgentRepository agentRepository, WarehouseRepository warehouseRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.agentRepository = agentRepository;
        this.warehouseRepository = warehouseRepository;
    }

    private static final double NEARBY_RADIUS_KM = 1.0; // group orders within 1 km

    @Scheduled(fixedRate = 10000) // every 10 seconds
public void autoAssignDrivers() {
    List<CustomerOrder> pendingOrders = orderRepository.findByStatus(OrderStatus.PENDING_ASSIGNMENT);
    if (pendingOrders.isEmpty())
        return;

    LocalDateTime now = LocalDateTime.now();

    for (CustomerOrder order : pendingOrders) {
        // ⏱ Only assign if order is at least 30 seconds old
        if (Duration.between(order.getCreatedAt(), now).getSeconds() < 30)
            continue;

        // 🏭 Get warehouse for this order
        final Warehouse warehouse = (order.getWarehouseId() != null)
                ? warehouseRepository.findById(order.getWarehouseId()).orElse(null)
                : null;

        if (warehouse == null || warehouse.getLatitude() == null || warehouse.getLongitude() == null) {
            log.warn("⚠️ Skipping order {} — missing warehouse or coordinates", order.getId());
            continue;
        }

        // 🧭 Find other nearby pending orders (within 1 km)
        List<CustomerOrder> nearbyOrders = pendingOrders.stream()
                .filter(o -> !o.equals(order))
                .filter(o -> o.getLatitude() != null && o.getLongitude() != null)
                .filter(o -> distance(order.getLatitude(), order.getLongitude(),
                        o.getLatitude(), o.getLongitude()) <= NEARBY_RADIUS_KM)
                .collect(Collectors.toList());

        // Include current order itself
        nearbyOrders.add(order);

        // ⚖️ Calculate total weight (in kilograms)
        double totalWeightKg = calculateTotalWeight(nearbyOrders);

        // 🚗 Decide vehicle type
        VehicleCapacity requiredCapacity = (totalWeightKg < 0.4)
                ? VehicleCapacity.TWO_WHEELER
                : VehicleCapacity.FOUR_WHEELER;

        // 🔍 Get available drivers matching vehicle type
        List<DeliveryAgent> eligibleAgents = agentRepository.findByStatus(AgentStatus.AVAILABLE).stream()
                .filter(a -> a.getVehicleCapacity() != null)
                .filter(a -> a.getLatitude() != null && a.getLongitude() != null)
                .filter(a -> a.getVehicleCapacity() == requiredCapacity)
                .collect(Collectors.toList());

        if (eligibleAgents.isEmpty()) {
            log.warn("⚠️ No eligible {} driver found for order {} (totalWeight={}kg)",
                    requiredCapacity, order.getId(), String.format("%.2f", totalWeightKg));
            continue;
        }

        // 📍 Find nearest driver (to warehouse, not customer)
        DeliveryAgent nearest = eligibleAgents.stream()
                .min(Comparator.comparingDouble(a -> distance(
                        a.getLatitude(), a.getLongitude(),
                        warehouse.getLatitude(), warehouse.getLongitude())))
                .orElse(null);

        if (nearest == null) {
            log.warn("⚠️ No nearest driver found for order {}", order.getId());
            continue;
        }

        // ✅ Assign driver to this and grouped nearby orders
        for (CustomerOrder o : nearbyOrders) {
            o.setDeliveryAgentId(nearest.getId());
            o.setStatus(OrderStatus.ASSIGNED);
            orderRepository.save(o);
        }

        nearest.setStatus(AgentStatus.ASSIGNED);
        agentRepository.save(nearest);

        log.info("✅ Assigned driver '{}' [{}] to orders {} | Vehicle: {} | TotalWeight={}kg | DistanceToWarehouse={}km",
                nearest.getName(),
                nearest.getStatus(),
                nearbyOrders.stream().map(CustomerOrder::getId).toList(),
                nearest.getVehicleCapacity(),
                String.format("%.2f", totalWeightKg),
                String.format("%.2f", distance(nearest.getLatitude(), nearest.getLongitude(),
                        warehouse.getLatitude(), warehouse.getLongitude())));
    }
}



    private double calculateTotalWeight(List<CustomerOrder> orders) {
        double total = 0.0;
        for (CustomerOrder order : orders) {
            Optional<Product> productOpt = productRepository.findById(order.getProductId());
            if (productOpt.isPresent()) {
                double w = productOpt.get().getWeight();
                total += (w * order.getQuantity()) / 1000.0; // convert g → kg
            }
        }
        return total;
    }

    private double distance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
