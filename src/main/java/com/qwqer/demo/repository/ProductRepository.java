package com.qwqer.demo.repository;

import com.qwqer.demo.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByMerchantId(Long merchantId);
    List<Product> findByNameContainingIgnoreCase(String name);
}