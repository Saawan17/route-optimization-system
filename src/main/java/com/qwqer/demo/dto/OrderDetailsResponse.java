package com.qwqer.demo.dto;

import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.entity.Customer;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.entity.Merchant;
import com.qwqer.demo.entity.Product;
import com.qwqer.demo.enums.OrderStatus;

public class OrderDetailsResponse {
    private String otp;
    private String productStatus;
    private Long orderId;
    private OrderStatus status;
    private String customerName;
    private String customerPhone;
    private String customerAddress;
    private String deliveryAgentName;
    private String deliveryAgentPhone;
    private String deliveryAgentAddress;
    private String merchantName;
    private String merchantPhone;
    private String merchantAddress;
    private String productName;
    private Double productPrice;
    private String createdAt;
    // Add more fields as needed

    public OrderDetailsResponse(Long orderId, OrderStatus status,
                                String customerName, String customerPhone, String customerAddress,
                                String deliveryAgentName, String deliveryAgentPhone, String deliveryAgentAddress,
                                String merchantName, String merchantPhone, String merchantAddress,
                                String productName, Double productPrice, String createdAt, String productStatus, String otp) {
        this.orderId = orderId;
        this.status = status;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.customerAddress = customerAddress;
        this.deliveryAgentName = deliveryAgentName;
        this.deliveryAgentPhone = deliveryAgentPhone;
        this.deliveryAgentAddress = deliveryAgentAddress;
        this.merchantName = merchantName;
        this.merchantPhone = merchantPhone;
        this.merchantAddress = merchantAddress;
        this.productName = productName;
        this.productPrice = productPrice;
        this.createdAt = createdAt;
        this.productStatus = productStatus;
        this.otp = otp;
    }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    public String getProductStatus() { return productStatus; }
    public void setProductStatus(String productStatus) { this.productStatus = productStatus; }

    // Getters and setters
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String customerAddress) { this.customerAddress = customerAddress; }
    public String getDeliveryAgentName() { return deliveryAgentName; }
    public void setDeliveryAgentName(String deliveryAgentName) { this.deliveryAgentName = deliveryAgentName; }
    public String getDeliveryAgentPhone() { return deliveryAgentPhone; }
    public void setDeliveryAgentPhone(String deliveryAgentPhone) { this.deliveryAgentPhone = deliveryAgentPhone; }
    public String getDeliveryAgentAddress() { return deliveryAgentAddress; }
    public void setDeliveryAgentAddress(String deliveryAgentAddress) { this.deliveryAgentAddress = deliveryAgentAddress; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public String getMerchantPhone() { return merchantPhone; }
    public void setMerchantPhone(String merchantPhone) { this.merchantPhone = merchantPhone; }
    public String getMerchantAddress() { return merchantAddress; }
    public void setMerchantAddress(String merchantAddress) { this.merchantAddress = merchantAddress; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Double getProductPrice() { return productPrice; }
    public void setProductPrice(Double productPrice) { this.productPrice = productPrice; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
