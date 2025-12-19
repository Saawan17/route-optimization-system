package com.qwqer.demo.dto;

import java.util.List;

public class OrderHistoryResponse {
    
    private Long customerId;
    private String customerName;
    private long totalOrders;
    private long deliveredOrders;
    private long pendingOrders;
    private List<com.qwqer.demo.entity.CustomerOrder> orders;
    
    // Constructors
    public OrderHistoryResponse() {}
    
    public OrderHistoryResponse(Long customerId, String customerName, long totalOrders, 
                               long deliveredOrders, long pendingOrders, 
                               List<com.qwqer.demo.entity.CustomerOrder> orders) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.totalOrders = totalOrders;
        this.deliveredOrders = deliveredOrders;
        this.pendingOrders = pendingOrders;
        this.orders = orders;
    }
    
    // Getters and Setters
    public Long getCustomerId() {
        return customerId;
    }
    
    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
    
    public String getCustomerName() {
        return customerName;
    }
    
    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }
    
    public long getTotalOrders() {
        return totalOrders;
    }
    
    public void setTotalOrders(long totalOrders) {
        this.totalOrders = totalOrders;
    }
    
    public long getDeliveredOrders() {
        return deliveredOrders;
    }
    
    public void setDeliveredOrders(long deliveredOrders) {
        this.deliveredOrders = deliveredOrders;
    }
    
    public long getPendingOrders() {
        return pendingOrders;
    }
    
    public void setPendingOrders(long pendingOrders) {
        this.pendingOrders = pendingOrders;
    }
    
    public List<com.qwqer.demo.entity.CustomerOrder> getOrders() {
        return orders;
    }
    
    public void setOrders(List<com.qwqer.demo.entity.CustomerOrder> orders) {
        this.orders = orders;
    }
}