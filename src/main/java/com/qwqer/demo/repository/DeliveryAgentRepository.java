package com.qwqer.demo.repository;

import com.qwqer.demo.entity.DeliveryAgent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryAgentRepository extends JpaRepository<DeliveryAgent, Long> {
    List<DeliveryAgent> findByStatus(DeliveryAgent.AgentStatus status);
    Optional<DeliveryAgent> findByAssignedOrderId(Long orderId);
    //List<DeliveryAgent> findByStatus(String status);
}