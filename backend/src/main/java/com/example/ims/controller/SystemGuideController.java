package com.example.ims.controller;

import com.example.ims.entity.SystemPageGuide;
import com.example.ims.repository.SystemPageGuideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

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
                .orElseGet(() -> {
                    SystemPageGuide defaultGuide = SystemPageGuide.builder()
                            .pageKey(pageKey)
                            .title(pageKey)
                            .content("시스템 표준 운영 가이드입니다.")
                            .sectionsJson("[]")
                            .updatedBy("SYSTEM_DEFAULT")
                            .build();
                    return ResponseEntity.ok(defaultGuide);
                });
    }

    @PostMapping
    @PreAuthorize("@perm.can('guideManagement', 'EDIT')")
    public ResponseEntity<SystemPageGuide> saveGuide(@RequestBody SystemPageGuide guide) {
        // [수정] ID가 있으면 기존 가이드 업데이트, 없으면 신규 생성
        SystemPageGuide existing = systemPageGuideRepository.findByPageKey(guide.getPageKey()).orElse(null);
        if (existing != null) {
            existing.setTitle(guide.getTitle());
            existing.setContent(guide.getContent());
            existing.setSectionsJson(guide.getSectionsJson());
            existing.setUpdatedBy(guide.getUpdatedBy());
            return ResponseEntity.ok(systemPageGuideRepository.save(existing));
        }
        return ResponseEntity.ok(systemPageGuideRepository.save(guide));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('guideManagement', 'DELETE')")
    public ResponseEntity<Void> deleteGuide(@PathVariable Long id) {
        systemPageGuideRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
