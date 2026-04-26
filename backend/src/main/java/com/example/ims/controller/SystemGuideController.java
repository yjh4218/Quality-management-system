package com.example.ims.controller;

import com.example.ims.entity.SystemPageGuide;
import com.example.ims.repository.SystemPageGuideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public controller for fetching system page guides on the frontend.
 */
@RestController
@RequestMapping("/api/guides")
@RequiredArgsConstructor
public class SystemGuideController {

    private final SystemPageGuideRepository systemPageGuideRepository;

    @GetMapping
    public ResponseEntity<List<SystemPageGuide>> getAllGuides() {
        return ResponseEntity.ok(systemPageGuideRepository.findAll());
    }

    @GetMapping("/{pageKey}")
    public ResponseEntity<SystemPageGuide> getGuideByKey(@PathVariable String pageKey) {
        return systemPageGuideRepository.findByPageKey(pageKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
