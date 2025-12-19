package com.qwqer.demo.dto;

public class DriverPositiondTO {
    private Long id;
    private String name;
    private String phone;
    private String vehicleCapacity; // e.g., "TWO_WHEELER" or "FOUR_WHEELER"
    private Double latitude;
    private Double longitude;
    private String status;

    public DriverPositiondTO() {}

    // getters / setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getVehicleCapacity() { return vehicleCapacity; }
    public void setVehicleCapacity(String vehicleCapacity) { this.vehicleCapacity = vehicleCapacity; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
