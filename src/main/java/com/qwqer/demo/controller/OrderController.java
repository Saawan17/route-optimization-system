package com.qwqer.demo.controller;

import com.qwqer.demo.dto.CreateOrderRequest;
import com.qwqer.demo.dto.CustomerOrderRequest;
import com.qwqer.demo.dto.MerchantOrderRequest;
import com.qwqer.demo.dto.OrderHistoryResponse;
import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.entity.DeliveryAgent.AgentStatus;
import com.qwqer.demo.enums.OrderStatus;
import com.qwqer.demo.repository.CustomerOrderRepository;
import com.qwqer.demo.service.OrderService;
import com.qwqer.demo.service.OrderWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Orders", description = "Customer order management APIs")
@CrossOrigin(origins = "*")
public class OrderController {
    @Autowired
    private com.qwqer.demo.repository.DeliveryAgentRepository deliveryAgentRepository;

    @Autowired
    private com.qwqer.demo.repository.CustomerRepository customerRepository;

    @Autowired
    private com.qwqer.demo.repository.MerchantRepository merchantRepository;

    @Autowired
    private com.qwqer.demo.repository.ProductRepository productRepository;

    @Autowired
    private com.qwqer.demo.repository.DeliveryAgentRepository agentRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OrderController.class);

    @GetMapping("/details")
    @Operation(summary = "Get all orders with detailed info")
    public ResponseEntity<List<com.qwqer.demo.dto.OrderDetailsResponse>> getAllOrderDetails() {
        List<CustomerOrder> orders = orderRepository.findAll();
        List<com.qwqer.demo.dto.OrderDetailsResponse> details = orders.stream().map(order -> {
            final String[] customerName = { null };
            final String[] customerPhone = { null };
            final String[] customerAddress = { null };
            final String[] deliveryAgentName = { null };
            final String[] deliveryAgentPhone = { null };
            final String[] deliveryAgentAddress = { null };
            final String[] merchantName = { null };
            final String[] merchantPhone = { null };
            final String[] merchantAddress = { null };
            final String[] productName = { null };
            final Double[] productPrice = { null };
            // Fetch customer
            if (order.getCustomerId() != null) {
                customerRepository.findById(order.getCustomerId()).ifPresent(c -> {
                    customerName[0] = c.getName();
                    customerPhone[0] = c.getPhone();
                    customerAddress[0] = c.getAddress();
                });
            }
            // Fetch delivery agent
            if (order.getDeliveryAgentId() != null) {
                deliveryAgentRepository.findById(order.getDeliveryAgentId()).ifPresent(a -> {
                    deliveryAgentName[0] = a.getName();
                    deliveryAgentPhone[0] = a.getPhone();
                    deliveryAgentAddress[0] = null; // Add address if available in DeliveryAgent entity
                });
            }
            // Fetch product and merchant
            if (order.getProductId() != null) {
                productRepository.findById(order.getProductId()).ifPresent(p -> {
                    productName[0] = p.getName();
                    if (p.getPrice() != null)
                        productPrice[0] = p.getPrice().doubleValue();
                    if (p.getMerchantId() != null) {
                        merchantRepository.findById(p.getMerchantId()).ifPresent(m -> {
                            merchantName[0] = m.getName();
                            merchantPhone[0] = m.getPhone();
                            merchantAddress[0] = null; // Add address if available in Merchant entity
                        });
                    }
                });
            }
            String createdAt = order.getCreatedAt() != null ? order.getCreatedAt().toString() : null;
            return new com.qwqer.demo.dto.OrderDetailsResponse(
                    order.getId(),
                    order.getStatus(),
                    customerName[0],
                    customerPhone[0],
                    customerAddress[0],
                    deliveryAgentName[0],
                    deliveryAgentPhone[0],
                    deliveryAgentAddress[0],
                    merchantName[0],
                    merchantPhone[0],
                    merchantAddress[0],
                    productName[0],
                    productPrice[0],
                    createdAt,
                    order.getStatus() != null ? order.getStatus().name() : null,
                    order.getOtp());
        }).toList();
        return ResponseEntity.ok(details);
    }

    @Autowired
    private CustomerOrderRepository orderRepository;

    @Autowired
    private OrderWorkflowService workflowService;

    @Autowired
    private OrderService orderService;

    @GetMapping
    @Operation(summary = "Get all orders")
    public List<CustomerOrder> getAllOrders() {
        return orderRepository.findAll();
    }

    @GetMapping("/healthcheck")
    @Operation(summary = "Health check endpoint")
    public ResponseEntity<String> checkHealthcheck() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID")
    public ResponseEntity<CustomerOrder> getOrderById(@PathVariable Long id) {
        Optional<CustomerOrder> order = orderRepository.findById(id);
        return order.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get orders by status")
    public List<CustomerOrder> getOrdersByStatus(@PathVariable OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get orders by product ID")
    public List<CustomerOrder> getOrdersByProduct(@PathVariable Long productId) {
        return orderRepository.findByProductId(productId);
    }

    // Enhanced order placement endpoints for different user types
    @PostMapping("/place")
    @Operation(summary = "Place a new order with full validation")
    public ResponseEntity<CustomerOrder> placeOrder(@Valid @RequestBody CreateOrderRequest request) {
        try {
            CustomerOrder order = orderService.createOrder(request);
            return new ResponseEntity<>(order, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/customer/{customerId}/place")
    @Operation(summary = "Customer creates their own order")
    public ResponseEntity<CustomerOrder> placeOrderByCustomer(
            @PathVariable Long customerId,
            @Valid @RequestBody CustomerOrderRequest request) {
        try {
            CustomerOrder order = orderService.createOrderByCustomer(customerId, request);
            return new ResponseEntity<>(order, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/merchant/place")
    @Operation(summary = "Merchant creates order on behalf of customer")
    public ResponseEntity<CustomerOrder> placeOrderByMerchant(@Valid @RequestBody MerchantOrderRequest request) {
        try {
            CustomerOrder order = orderService.createOrderByMerchant(request);
            return new ResponseEntity<>(order, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // New customer order history endpoints
    @GetMapping("/customer/{customerId}/history")
    @Operation(summary = "Get complete order history for a customer")
    public ResponseEntity<OrderHistoryResponse> getCustomerOrderHistory(@PathVariable Long customerId) {
        try {
            OrderHistoryResponse history = orderService.getCustomerOrderHistory(customerId);
            return ResponseEntity.ok(history);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/customer/{customerId}/orders")
    @Operation(summary = "Get orders for a customer by status")
    public ResponseEntity<List<CustomerOrder>> getCustomerOrdersByStatus(
            @PathVariable Long customerId,
            @RequestParam(required = false) @Parameter(description = "Filter by order status") OrderStatus status) {
        try {
            List<CustomerOrder> orders;
            if (status != null) {
                orders = orderService.getCustomerOrdersByStatus(customerId, status);
            } else {
                orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
            }
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/customer/{customerId}/orders/date-range")
    @Operation(summary = "Get customer orders within a date range")
    public ResponseEntity<List<CustomerOrder>> getCustomerOrdersByDateRange(
            @PathVariable Long customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            List<CustomerOrder> orders = orderService.getCustomerOrdersByDateRange(customerId, startDate, endDate);
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{orderId}/cancel")
    @Operation(summary = "Cancel an order")
    public ResponseEntity<CustomerOrder> cancelOrder(@PathVariable Long orderId) {
        try {
            CustomerOrder order = orderService.cancelOrder(orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Legacy endpoint for backward compatibility
    @PostMapping
    @Operation(summary = "Create a new order (legacy)")
    public ResponseEntity<CustomerOrder> createOrder(@Valid @RequestBody CustomerOrder order) {
        CustomerOrder savedOrder = orderRepository.save(order);
        return new ResponseEntity<>(savedOrder, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an order")
    public ResponseEntity<CustomerOrder> updateOrder(@PathVariable Long id, @Valid @RequestBody CustomerOrder order) {
        if (!orderRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        order.setId(id);
        CustomerOrder updatedOrder = orderRepository.save(order);
        return ResponseEntity.ok(updatedOrder);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an order")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        if (!orderRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // Unassign driver if any
        Optional<DeliveryAgent> assignedAgents = deliveryAgentRepository.findByAssignedOrderId(id);
        if (assignedAgents.isPresent()) {
            DeliveryAgent agent = assignedAgents.get();
            agent.setAssignedOrderId(null);
            agent.setStatus(DeliveryAgent.AgentStatus.AVAILABLE);
            deliveryAgentRepository.save(agent);
        }
        orderRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Workflow endpoints
    @PostMapping("/{orderId}/assign-agent/{agentId}")
    @Operation(summary = "Assign delivery agent to order")
    public ResponseEntity<CustomerOrder> assignAgent(@PathVariable Long orderId, @PathVariable Long agentId) {
        try {
            CustomerOrder order = workflowService.assignAgentToOrder(orderId, agentId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{orderId}/pickup")
    @Operation(summary = "Mark order as picked up")
    public ResponseEntity<CustomerOrder> markPickedUp(@PathVariable Long orderId) {
        try {
            CustomerOrder order = workflowService.markOrderPickedUp(orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{orderId}/out-for-delivery")
    @Operation(summary = "Mark order as out for delivery")
    public ResponseEntity<CustomerOrder> markOutForDelivery(@PathVariable Long orderId) {
        try {
            CustomerOrder order = workflowService.markOrderOutForDelivery(orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{orderId}/deliver")
    @Operation(summary = "Mark order as delivered with OTP verification")
    public ResponseEntity<CustomerOrder> deliverOrder(@PathVariable Long orderId,
            @RequestBody Map<String, String> request) {
        try {
            String otp = request.get("otp");
            System.out.println("Received OTP: " + otp);
            CustomerOrder order = workflowService.deliverOrder(orderId, otp);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{orderId}/pickup")
    public ResponseEntity<?> markOrderPickedUp(@PathVariable Long orderId) {
        Optional<CustomerOrder> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Order not found");
        }

        CustomerOrder order = orderOpt.get();
        if (order.getStatus() != OrderStatus.ASSIGNED) {
            return ResponseEntity.badRequest().body("Order not in ASSIGNED state");
        }

        order.setStatus(OrderStatus.PICKED_UP);
        orderRepository.save(order);

        // 🚗 Update the driver status too
        if (order.getDeliveryAgentId() != null) {
            Optional<DeliveryAgent> agentOpt = agentRepository.findById(order.getDeliveryAgentId());
            if (agentOpt.isPresent()) {
                DeliveryAgent agent = agentOpt.get();
                agent.setStatus(AgentStatus.ON_DELIVERY);
                agentRepository.save(agent);
            }
        }

        log.info("✅ Order {} marked as PICKED_UP", orderId);
        return ResponseEntity.ok(order);
    }


    @PutMapping("/{orderId}/delivered")
public ResponseEntity<?> markOrderDelivered(@PathVariable Long orderId) {
    Optional<CustomerOrder> orderOpt = orderRepository.findById(orderId);
    if (orderOpt.isEmpty()) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Order not found");
    }

    CustomerOrder order = orderOpt.get();
    if (order.getStatus() != OrderStatus.PICKED_UP) {
        return ResponseEntity.badRequest().body("Order not in PICKED_UP state");
    }

    order.setStatus(OrderStatus.DELIVERED);
    orderRepository.save(order);

    // 🚗 free the driver
    if (order.getDeliveryAgentId() != null) {
        agentRepository.findById(order.getDeliveryAgentId()).ifPresent(agent -> {
            agent.setAssignedOrderId(null);
            agent.setStatus(AgentStatus.AVAILABLE);
            agentRepository.save(agent);
        });
    }

    log.info("✅ Order {} marked as DELIVERED", orderId);
    return ResponseEntity.ok(order);
}

}