package com.qwqer.demo.controller;

import com.qwqer.demo.entity.Merchant;
import com.qwqer.demo.service.MerchantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/merchants")
@Tag(name = "Merchants", description = "Merchant management APIs")
@CrossOrigin(origins = "*")
public class MerchantController {
    
    @Autowired
    private MerchantService merchantService;
    
    @GetMapping
    @Operation(summary = "Get all merchants")
    public List<Merchant> getAllMerchants() {
        return merchantService.getAllMerchants();
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get merchant by ID")
    public ResponseEntity<Merchant> getMerchantById(@PathVariable Long id) {
        try {
            Merchant merchant = merchantService.getMerchantById(id);
            return ResponseEntity.ok(merchant);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping
    @Operation(summary = "Create a new merchant")
    public ResponseEntity<Merchant> createMerchant(@Valid @RequestBody Merchant merchant) {
        try {
            Merchant savedMerchant = merchantService.createMerchant(merchant);
            return new ResponseEntity<>(savedMerchant, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Update a merchant")
    public ResponseEntity<Merchant> updateMerchant(@PathVariable Long id, @Valid @RequestBody Merchant merchant) {
        try {
            Merchant updatedMerchant = merchantService.updateMerchant(id, merchant);
            return ResponseEntity.ok(updatedMerchant);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a merchant")
    public ResponseEntity<String> deleteMerchant(@PathVariable Long id) {
        try {
            merchantService.deleteMerchant(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}