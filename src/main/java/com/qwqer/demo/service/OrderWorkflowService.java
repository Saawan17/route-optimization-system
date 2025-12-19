package com.qwqer.demo.service;

import com.enums.VehicleCapacity;
import com.qwqer.demo.controller.DriverLocationController;
import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.enums.OrderStatus;
import com.qwqer.demo.repository.CustomerOrderRepository;
import com.qwqer.demo.repository.DeliveryAgentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;

@Service
public class OrderWorkflowService {
    
    @Autowired
    private CustomerOrderRepository orderRepository;
    
    @Autowired
    private DeliveryAgentRepository agentRepository;
    
    @Autowired
    private DriverLocationController driverLocationController;

    private final SecureRandom random = new SecureRandom();
    
    @Transactional
    public CustomerOrder assignAgentToOrder(Long orderId, Long agentId) {
        CustomerOrder order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        DeliveryAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new RuntimeException("Agent not found"));
        
        if (agent.getStatus() != DeliveryAgent.AgentStatus.AVAILABLE) {
            throw new RuntimeException("Agent is not available");
        }
        
        // Update agent
        agent.setAssignedOrderId(orderId);
        agent.setStatus(DeliveryAgent.AgentStatus.ASSIGNED);
        agentRepository.save(agent);
        
        // Update order
        order.setDeliveryAgentId(agentId);
        order.setStatus(OrderStatus.ASSIGNED);
        return orderRepository.save(order);
    }
    
    @Transactional
    public CustomerOrder markOrderPickedUp(Long orderId) {
        CustomerOrder order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        if (order.getStatus() != OrderStatus.ASSIGNED) {
            throw new RuntimeException("Order must be assigned before pickup");
        }
        
        // Generate OTP for delivery
        String otp = String.format("%06d", random.nextInt(1000000));
        order.setOtp(otp);
        order.setStatus(OrderStatus.PICKED_UP);
        
        // Update agent status
        Optional<DeliveryAgent> agentOpt = agentRepository.findByAssignedOrderId(orderId);
        if (agentOpt.isPresent()) {
            DeliveryAgent agent = agentOpt.get();
            agent.setStatus(DeliveryAgent.AgentStatus.ON_DELIVERY);
            agentRepository.save(agent);
        }
        
        return orderRepository.save(order);
    }
    
    @Transactional
    public CustomerOrder markOrderOutForDelivery(Long orderId) {
        CustomerOrder order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        if (order.getStatus() != OrderStatus.PICKED_UP) {
            throw new RuntimeException("Order must be picked up before marking out for delivery");
        }
        
        order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        return orderRepository.save(order);
    }
    
    @Transactional
    public CustomerOrder deliverOrder(Long orderId, String providedOtp) {
        CustomerOrder order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));

            System.out.println("Order OTP: " + order.getOtp());
        
        if (order.getStatus() != OrderStatus.OUT_FOR_DELIVERY) {
            throw new RuntimeException("Order must be out for delivery");
        }
        
        System.out.println("Provided OTP: " + providedOtp);
       
        // if (providedOtp != null && !order.getOtp().equals(providedOtp)) {
        //     System.out.println("Invalid OTP provided.");
        //     throw new RuntimeException("Invalid OTP");
        // }
        

        
        order.setStatus(OrderStatus.DELIVERED);
        
        // Free up the agent
        Optional<DeliveryAgent> agentOpt = agentRepository.findByAssignedOrderId(orderId);
        if (agentOpt.isPresent()) {
            DeliveryAgent agent = agentOpt.get();
            agent.setAssignedOrderId(null);
            agent.setStatus(DeliveryAgent.AgentStatus.AVAILABLE);
            agentRepository.save(agent);
        }

        System.out.println("Order delivered successfully.");
        
        return orderRepository.save(order);
    }

    @Transactional
    public CustomerOrder autoAssignDriver(CustomerOrder order) {
    List<DeliveryAgent> availableAgents = agentRepository.findByStatus(DeliveryAgent.AgentStatus.AVAILABLE);
    if (availableAgents.isEmpty()) return order;

    DeliveryAgent nearest = null;
    double minDist = Double.MAX_VALUE;

    for (DeliveryAgent a : availableAgents) {
        if (order.getQuantity() <= 2 && !a.getVehicleCapacity().equals(VehicleCapacity.TWO_WHEELER)) continue;
        if (order.getQuantity() > 2 && !a.getVehicleCapacity().equals(VehicleCapacity.FOUR_WHEELER)) continue;
        if (a.getLatitude() == null || a.getLongitude() == null) continue;

        double dist = driverLocationController.distance(a.getLatitude(), a.getLongitude(),
                order.getCustomer().getLatitude(), order.getCustomer().getLongitude());
        if (dist < minDist) {
            minDist = dist;
            nearest = a;
        }
    }

    if (nearest != null) {
        nearest.setAssignedOrderId(order.getId());
        nearest.setStatus(DeliveryAgent.AgentStatus.ASSIGNED);
        order.setDeliveryAgentId(nearest.getId());
        order.setStatus(OrderStatus.ASSIGNED);
        agentRepository.save(nearest);
        orderRepository.save(order);
    }

    return order;
}

}