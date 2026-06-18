package com.example.ims.controller;

import com.example.ims.entity.Announcement;
import com.example.ims.entity.AnnouncementCategory;
import com.example.ims.service.AnnouncementService;
import com.example.ims.service.AnnouncementCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 전체공지사항(Announcement) REST 컨트롤러.
 * [보안 & RBAC] @PreAuthorize와 @perm.can을 통해 메뉴별 인가 처리를 제어합니다.
 */
@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final AnnouncementCategoryService categoryService;

    /**
     * 모든 전체공지 조회 (관리자/운영모니터링 전체 목록용)
     */
    @GetMapping
    @PreAuthorize("@perm.can('announcements', 'VIEW')")
    public ResponseEntity<List<Announcement>> getAllAnnouncements() {
        return ResponseEntity.ok(announcementService.getAllAnnouncements());
    }

    /**
     * 현재 로그인 사용자 대상의 대시보드용 활성 공지사항 조회
     */
    @GetMapping("/active")
    public ResponseEntity<List<Announcement>> getActiveAnnouncements(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(announcementService.getActiveAnnouncementsForUser(userDetails.getUsername()));
    }

    /**
     * 신규 전체공지 등록
     */
    @PostMapping
    @PreAuthorize("@perm.can('announcements', 'EDIT')")
    public ResponseEntity<Announcement> createAnnouncement(@RequestBody Announcement announcement,
                                                           @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(announcementService.createAnnouncement(announcement, userDetails.getUsername()));
    }

    /**
     * 전체공지 정보 수정
     */
    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('announcements', 'EDIT')")
    public ResponseEntity<Announcement> updateAnnouncement(@PathVariable Long id,
                                                           @RequestBody Announcement announcement,
                                                           @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(announcementService.updateAnnouncement(id, announcement, userDetails.getUsername()));
    }

    /**
     * 전체공지 삭제 (Soft Delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('announcements', 'DELETE')")
    public ResponseEntity<Void> deleteAnnouncement(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        announcementService.deleteAnnouncement(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * 전체공지 대상 사용자들에게 이메일 발송
     */
    @PostMapping("/{id}/send-email")
    @PreAuthorize("@perm.can('announcements', 'EDIT')")
    public ResponseEntity<Void> sendAnnouncementEmail(@PathVariable Long id) {
        announcementService.sendAnnouncementEmail(id);
        return ResponseEntity.ok().build();
    }

    // --- Announcement Category APIs ---

    @GetMapping("/categories")
    @PreAuthorize("@perm.can('announcementCategories', 'VIEW') or @perm.can('announcements', 'VIEW')")
    public ResponseEntity<List<AnnouncementCategory>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @PostMapping("/categories")
    @PreAuthorize("@perm.can('announcementCategories', 'EDIT')")
    public ResponseEntity<AnnouncementCategory> createCategory(@RequestBody AnnouncementCategory category) {
        return ResponseEntity.ok(categoryService.createCategory(category));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("@perm.can('announcementCategories', 'EDIT')")
    public ResponseEntity<AnnouncementCategory> updateCategory(@PathVariable Long id,
                                                                   @RequestBody AnnouncementCategory category) {
        return ResponseEntity.ok(categoryService.updateCategory(id, category));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("@perm.can('announcementCategories', 'DELETE')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
