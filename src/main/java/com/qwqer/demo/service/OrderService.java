package com.qwqer.demo.service;

import com.qwqer.demo.dto.CreateOrderRequest;
import com.qwqer.demo.dto.CustomerOrderRequest;
import com.qwqer.demo.dto.MerchantOrderRequest;
import com.qwqer.demo.dto.OrderHistoryResponse;
import com.qwqer.demo.entity.Customer;
import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.Product;
import com.qwqer.demo.enums.OrderStatus;
import com.qwqer.demo.repository.CustomerOrderRepository;
import com.qwqer.demo.repository.CustomerRepository;
import com.qwqer.demo.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private CustomerOrderRepository orderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Transactional
    public CustomerOrder createOrder(CreateOrderRequest request) {
        // Validate customer exists
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found with ID: " + request.getCustomerId()));

        // Validate product exists
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + request.getProductId()));

        // Create new order
        CustomerOrder order = new CustomerOrder(
                request.getCustomerId(),
                request.getCustomerName(),
                request.getAddress(),
                request.getProductId(),
                request.getTotalAmount(),
                request.getQuantity());

        if (request.getNotes() != null && !request.getNotes().trim().isEmpty()) {
            order.setNotes(request.getNotes());
        }

        if (request.getWarehouseId() != null) {
            order.setWarehouseId(request.getWarehouseId());
        }

        return orderRepository.save(order);
    }

    @Transactional
    public CustomerOrder createOrderByCustomer(Long customerId, CustomerOrderRequest request) {
        // Validate customer exists
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found with ID: " + customerId));

        // Validate product exists
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + request.getProductId()));

        // Calculate total amount based on product price and quantity
        BigDecimal totalAmount = product.getPrice().multiply(BigDecimal.valueOf(request.getQuantity()));

        // Create new order
        CustomerOrder order = new CustomerOrder(
                customerId,
                customer.getName(),
                request.getAddress(),
                request.getProductId(),
                totalAmount,
                request.getQuantity());

        if (request.getNotes() != null && !request.getNotes().trim().isEmpty()) {
            order.setNotes(request.getNotes());
        }

        return orderRepository.save(order);
    }

    @Transactional
    public CustomerOrder createOrderByMerchant(MerchantOrderRequest request) {
        // Validate or create customer
        Customer customer;
        if (request.getCustomerId() != null && request.getCustomerId() > 0) {
            // Try to find existing customer
            customer = customerRepository.findById(request.getCustomerId())
                    .orElse(null);

            if (customer != null) {
                // Update customer details if they differ
                if (!customer.getName().equals(request.getCustomerName())) {
                    customer.setName(request.getCustomerName());
                }
                if (!customer.getPhone().equals(request.getCustomerPhone())) {
                    customer.setPhone(request.getCustomerPhone());
                }
                customer = customerRepository.save(customer);
            }
        } else {
            customer = null;
        }

        // If customer still doesn't exist, create a new one
        if (customer == null) {
            customer = new Customer();
            customer.setName(request.getCustomerName());
            customer.setPhone(request.getCustomerPhone());
            customer.setAddress(request.getAddress());
            customer = customerRepository.save(customer);
        }

        // Validate product exists
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + request.getProductId()));

        // Create new order
        CustomerOrder order = new CustomerOrder(
                customer.getId(),
                request.getCustomerName(),
                request.getAddress(),
                request.getProductId(),
                request.getTotalAmount(),
                request.getQuantity());

        // Combine customer notes and merchant notes
        StringBuilder notes = new StringBuilder();
        if (request.getNotes() != null && !request.getNotes().trim().isEmpty()) {
            notes.append("Customer: ").append(request.getNotes());
        }
        if (request.getMerchantNotes() != null && !request.getMerchantNotes().trim().isEmpty()) {
            if (notes.length() > 0) {
                notes.append(" | ");
            }
            notes.append("Merchant: ").append(request.getMerchantNotes());
        }

        if (notes.length() > 0) {
            order.setNotes(notes.toString());
        }

        return orderRepository.save(order);
    }

    public OrderHistoryResponse getCustomerOrderHistory(Long customerId) {
        // Validate customer exists
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found with ID: " + customerId));

        // Get order statistics
        long totalOrders = orderRepository.countByCustomerId(customerId);
        long deliveredOrders = orderRepository.countByCustomerIdAndStatus(customerId, OrderStatus.DELIVERED);
        long pendingOrders = totalOrders - deliveredOrders -
                orderRepository.countByCustomerIdAndStatus(customerId, OrderStatus.CANCELLED);

        // Get all orders for the customer
        List<CustomerOrder> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);

        return new OrderHistoryResponse(
                customerId,
                customer.getName(),
                totalOrders,
                deliveredOrders,
                pendingOrders,
                orders);
    }

    public List<CustomerOrder> getCustomerOrdersByStatus(Long customerId, OrderStatus status) {
        // Validate customer exists
        customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found with ID: " + customerId));

        return orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, status);
    }

    public List<CustomerOrder> getCustomerOrdersByDateRange(Long customerId, LocalDateTime startDate,
            LocalDateTime endDate) {
        // Validate customer exists
        customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found with ID: " + customerId));

        return orderRepository.findByCustomerIdAndDateRange(customerId, startDate, endDate);
    }

    @Transactional
    public CustomerOrder cancelOrder(Long orderId) {
        CustomerOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + orderId));

        // Only allow cancellation if order is not yet picked up
        if (order.getStatus() == OrderStatus.PICKED_UP ||
                order.getStatus() == OrderStatus.OUT_FOR_DELIVERY ||
                order.getStatus() == OrderStatus.DELIVERED) {
            throw new RuntimeException("Cannot cancel order in status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        return orderRepository.save(order);
    }
}