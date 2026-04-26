package com.example.ims;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.example.ims")
@EnableJpaRepositories(basePackages = "com.example.ims.repository")
@org.springframework.cache.annotation.EnableCaching
@org.springframework.scheduling.annotation.EnableScheduling
public class ImsApplication {

	public static void main(String[] args) {
		SpringApplication.run(ImsApplication.class, args);
	}

}
// Deployment Trigger v6