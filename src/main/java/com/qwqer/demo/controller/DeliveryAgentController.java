package com.qwqer.demo.controller;

import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.repository.DeliveryAgentRepository;
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
@RequestMapping("/api/agents")
@Tag(name = "Delivery Agents", description = "Delivery agent management APIs")
@CrossOrigin(origins = "*")
public class DeliveryAgentController {
    
    @Autowired
    private DeliveryAgentRepository agentRepository;
    
    @GetMapping
    @Operation(summary = "Get all delivery agents")
    public List<DeliveryAgent> getAllAgents() {
        return agentRepository.findAll();
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get delivery agent by ID")
    public ResponseEntity<DeliveryAgent> getAgentById(@PathVariable Long id) {
        Optional<DeliveryAgent> agent = agentRepository.findById(id);
        return agent.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Get agents by status")
    public List<DeliveryAgent> getAgentsByStatus(@PathVariable DeliveryAgent.AgentStatus status) {
        return agentRepository.findByStatus(status);
    }
    
    @GetMapping("/available")
    @Operation(summary = "Get available delivery agents")
    public List<DeliveryAgent> getAvailableAgents() {
        return agentRepository.findByStatus(DeliveryAgent.AgentStatus.AVAILABLE);
    }
    
    @PostMapping
    @Operation(summary = "Create a new delivery agent")
    public ResponseEntity<DeliveryAgent> createAgent(@Valid @RequestBody DeliveryAgent agent) {
        DeliveryAgent savedAgent = agentRepository.save(agent);
        return new ResponseEntity<>(savedAgent, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Update a delivery agent")
    public ResponseEntity<DeliveryAgent> updateAgent(@PathVariable Long id, @Valid @RequestBody DeliveryAgent agent) {
        if (!agentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        agent.setId(id);
        DeliveryAgent updatedAgent = agentRepository.save(agent);
        return ResponseEntity.ok(updatedAgent);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a delivery agent")
    public ResponseEntity<Void> deleteAgent(@PathVariable Long id) {
        if (!agentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        agentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}