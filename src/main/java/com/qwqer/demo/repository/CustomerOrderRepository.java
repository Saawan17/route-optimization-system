package com.qwqer.demo.repository;

import com.qwqer.demo.entity.CustomerOrder;
import com.qwqer.demo.enums.OrderStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findByCustomerNameContainingIgnoreCase(String customerName);
    List<CustomerOrder> findByStatus(OrderStatus status);
    List<CustomerOrder> findByProductId(Long productId);
    
    // New methods for enhanced functionality
    List<CustomerOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CustomerOrder> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, OrderStatus status);
    
    @Query("SELECT o FROM CustomerOrder o WHERE o.customerId = :customerId AND o.createdAt BETWEEN :startDate AND :endDate ORDER BY o.createdAt DESC")
    List<CustomerOrder> findByCustomerIdAndDateRange(@Param("customerId") Long customerId, 
                                                    @Param("startDate") LocalDateTime startDate, 
                                                    @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(o) FROM CustomerOrder o WHERE o.customerId = :customerId")
    long countByCustomerId(@Param("customerId") Long customerId);
    
    @Query("SELECT COUNT(o) FROM CustomerOrder o WHERE o.customerId = :customerId AND o.status = :status")
    long countByCustomerIdAndStatus(@Param("customerId") Long customerId, @Param("status") OrderStatus status);

    //List<CustomerOrder> findByStatus(OrderStatus status);

}