package com.qwqer.demo.entity;

import com.enums.VehicleCapacity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "delivery_agents")
public class DeliveryAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column
    private String phone;

    @Column(name = "assigned_order_id")
    private Long assignedOrderId;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_order_id", insertable = false, updatable = false)
    private CustomerOrder assignedOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AgentStatus status = AgentStatus.AVAILABLE;

    @Column(length = 6)
    private String pinCode;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(length = 255)
    private String address;

    // 🆕 New field for vehicle capacity
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleCapacity vehicleCapacity;

    // Constructors
    public DeliveryAgent() {
    }

    public DeliveryAgent(String name, String phone) {
        this.name = name;
        this.phone = phone;
        this.status = AgentStatus.AVAILABLE;
    }

    public enum AgentStatus {
        AVAILABLE, ASSIGNED, ON_DELIVERY, OFFLINE, PICKED_UP
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Long getAssignedOrderId() {
        return assignedOrderId;
    }

    public void setAssignedOrderId(Long assignedOrderId) {
        this.assignedOrderId = assignedOrderId;
    }

    public CustomerOrder getAssignedOrder() {
        return assignedOrder;
    }

    public void setAssignedOrder(CustomerOrder assignedOrder) {
        this.assignedOrder = assignedOrder;
    }

    public AgentStatus getStatus() {
        return status;
    }

    public void setStatus(AgentStatus status) {
        this.status = status;
    }

    public String getPinCode() {
        return pinCode;
    }

    public void setPinCode(String pinCode) {
        this.pinCode = pinCode;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public VehicleCapacity getVehicleCapacity() {
        return vehicleCapacity;
    }

    public void setVehicleCapacity(VehicleCapacity vehicleCapacity) {
        this.vehicleCapacity = vehicleCapacity;
    }

}