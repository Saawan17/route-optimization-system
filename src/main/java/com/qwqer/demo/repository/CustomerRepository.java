package com.qwqer.demo.repository;

import com.qwqer.demo.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    
    List<Customer> findByNameContainingIgnoreCase(String name);
    
    List<Customer> findByEmail(String email);
    
    List<Customer> findByPhone(String phone);
}