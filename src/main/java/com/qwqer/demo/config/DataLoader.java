package com.qwqer.demo.config;

import com.qwqer.demo.entity.Customer;
import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.entity.Merchant;
import com.qwqer.demo.entity.Product;
import com.qwqer.demo.repository.CustomerRepository;
import com.qwqer.demo.repository.DeliveryAgentRepository;
import com.qwqer.demo.repository.MerchantRepository;
import com.qwqer.demo.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataLoader implements CommandLineRunner {
    
    @Autowired
    private MerchantRepository merchantRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private DeliveryAgentRepository agentRepository;
    
    @Autowired
    private CustomerRepository customerRepository;
    
    @Override
    public void run(String... args) throws Exception {
        // Load sample merchants
        if (merchantRepository.count() == 0) {
            Merchant merchant1 = new Merchant("Pizza Palace", "contact@pizzapalace.com", "+1-555-0123");
            Merchant merchant2 = new Merchant("Burger Junction", "orders@burgerjunction.com", "+1-555-0124");
            Merchant merchant3 = new Merchant("Coffee Corner", "hello@coffeecorner.com", "+1-555-0125");
            
            merchantRepository.save(merchant1);
            merchantRepository.save(merchant2);
            merchantRepository.save(merchant3);
            
            System.out.println("Sample merchants loaded");
        }
        
        // Load sample products
        if (productRepository.count() == 0) {
            // Pizza Palace products
            Product product1 = new Product("Margherita Pizza", "Classic pizza with tomato, mozzarella, and basil", new BigDecimal("12.99"), 1L);
            Product product2 = new Product("Pepperoni Pizza", "Pizza with pepperoni and mozzarella cheese", new BigDecimal("14.99"), 1L);
            Product product3 = new Product("Supreme Pizza", "Pizza with pepperoni, sausage, peppers, onions", new BigDecimal("16.99"), 1L);
            
            // Burger Junction products
            Product product4 = new Product("Classic Burger", "Beef patty with lettuce, tomato, and sauce", new BigDecimal("8.99"), 2L);
            Product product5 = new Product("Cheese Burger", "Classic burger with cheese", new BigDecimal("9.99"), 2L);
            Product product6 = new Product("Chicken Burger", "Grilled chicken breast with lettuce and mayo", new BigDecimal("9.49"), 2L);
            
            // Coffee Corner products
            Product product7 = new Product("Espresso", "Strong Italian coffee", new BigDecimal("3.99"), 3L);
            Product product8 = new Product("Cappuccino", "Espresso with steamed milk and foam", new BigDecimal("4.99"), 3L);
            Product product9 = new Product("Latte", "Espresso with steamed milk", new BigDecimal("5.49"), 3L);
            
            productRepository.save(product1);
            productRepository.save(product2);
            productRepository.save(product3);
            productRepository.save(product4);
            productRepository.save(product5);
            productRepository.save(product6);
            productRepository.save(product7);
            productRepository.save(product8);
            productRepository.save(product9);
            
            System.out.println("Sample products loaded");
        }
        
        // Load sample delivery agents
        if (agentRepository.count() == 0) {
            DeliveryAgent agent1 = new DeliveryAgent("Alex Driver", "+1-555-2001");
            DeliveryAgent agent2 = new DeliveryAgent("Maria Rodriguez", "+1-555-2002");
            DeliveryAgent agent3 = new DeliveryAgent("Tom Williams", "+1-555-2003");
            DeliveryAgent agent4 = new DeliveryAgent("Lisa Chen", "+1-555-2004");
            
            agent3.setStatus(DeliveryAgent.AgentStatus.ON_DELIVERY);
            
            agentRepository.save(agent1);
            agentRepository.save(agent2);
            agentRepository.save(agent3);
            agentRepository.save(agent4);
            
            System.out.println("Sample delivery agents loaded");
        }
        
        // // Load sample customers
        // if (customerRepository.count() == 0) {
        //     Customer customer1 = new Customer("John Smith", "john.smith@email.com", "+1-555-1001", "123 Main St, City, State 12345");
        //     Customer customer2 = new Customer("Jane Doe", "jane.doe@email.com", "+1-555-1002", "456 Oak Ave, City, State 12346");
        //     Customer customer3 = new Customer("Mike Johnson", "mike.johnson@email.com", "+1-555-1003", "789 Pine Rd, City, State 12347");
        //     Customer customer4 = new Customer("Sarah Wilson", "sarah.wilson@email.com", "+1-555-1004", "321 Elm St, City, State 12348");
        //     Customer customer5 = new Customer("David Brown", "david.brown@email.com", "+1-555-1005", "654 Maple Dr, City, State 12349");
            
        //     customerRepository.save(customer1);
        //     customerRepository.save(customer2);
        //     customerRepository.save(customer3);
        //     customerRepository.save(customer4);
        //     customerRepository.save(customer5);
            
        //     System.out.println("Sample customers loaded");
        // }
        
        System.out.println("Demo data initialization completed!");
    }
}