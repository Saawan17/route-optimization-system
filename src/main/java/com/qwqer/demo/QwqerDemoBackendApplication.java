package com.qwqer.demo;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QwqerDemoBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(QwqerDemoBackendApplication.class, args);
    }

    @PostConstruct
    public void logPort() {
        System.out.println("PORT ENV = " + System.getenv("PORT"));
    }


}