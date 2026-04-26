package com.example.ims.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Global Root Controller to handle the base URL.
 * Essential for Render Health Checks pointing to the domain root.
 */
@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<String> root() {
        return ResponseEntity.ok("IMS-API-v6-LIVE");
    }
}
