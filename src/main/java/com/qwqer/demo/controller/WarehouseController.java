package com.qwqer.demo.controller;

import com.qwqer.demo.entity.Warehouse;
import com.qwqer.demo.repository.WarehouseRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/warehouses")
@Tag(name = "Warehouses", description = "Warehouse management APIs")
@CrossOrigin(origins = "*")
public class WarehouseController {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @GetMapping
    @Operation(summary = "Get all warehouses")
    public List<Warehouse> getAllWarehouses() {
        return warehouseRepository.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get warehouse by ID")
    public ResponseEntity<Warehouse> getWarehouseById(@PathVariable Long id) {
        Optional<Warehouse> warehouse = warehouseRepository.findById(id);
        return warehouse.map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create new warehouse")
    public ResponseEntity<Warehouse> createWarehouse(@Valid @RequestBody Warehouse warehouse) {
        Warehouse savedWarehouse = warehouseRepository.save(warehouse);
        return new ResponseEntity<>(savedWarehouse, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update warehouse details")
    public ResponseEntity<Warehouse> updateWarehouse(@PathVariable Long id, @Valid @RequestBody Warehouse warehouse) {
        if (!warehouseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        warehouse.setId(id);
        Warehouse updatedWarehouse = warehouseRepository.save(warehouse);
        return ResponseEntity.ok(updatedWarehouse);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a warehouse")
    public ResponseEntity<Void> deleteWarehouse(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        warehouseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
