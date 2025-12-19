package com.qwqer.demo.service;

import com.qwqer.demo.entity.Merchant;
import com.qwqer.demo.entity.Product;
import com.qwqer.demo.repository.MerchantRepository;
import com.qwqer.demo.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MerchantService {
    
    @Autowired
    private MerchantRepository merchantRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Transactional
    public void deleteMerchant(Long merchantId) {
        // Check if merchant exists
        Merchant merchant = merchantRepository.findById(merchantId)
            .orElseThrow(() -> new RuntimeException("Merchant not found with ID: " + merchantId));
        
        // Check if merchant has products
        List<Product> products = productRepository.findByMerchantId(merchantId);
        
        if (!products.isEmpty()) {
            throw new RuntimeException("Cannot delete merchant. Please delete all associated products first. Found " + 
                                     products.size() + " product(s) associated with this merchant.");
        }
        
        // Delete merchant if no products are associated
        merchantRepository.deleteById(merchantId);
    }
    
    public Merchant createMerchant(Merchant merchant) {
        return merchantRepository.save(merchant);
    }
    
    public Merchant updateMerchant(Long id, Merchant merchant) {
        if (!merchantRepository.existsById(id)) {
            throw new RuntimeException("Merchant not found with ID: " + id);
        }
        merchant.setId(id);
        return merchantRepository.save(merchant);
    }
    
    public Merchant getMerchantById(Long id) {
        return merchantRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Merchant not found with ID: " + id));
    }
    
    public List<Merchant> getAllMerchants() {
        return merchantRepository.findAll();
    }
}