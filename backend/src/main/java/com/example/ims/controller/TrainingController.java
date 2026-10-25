package com.example.ims.controller;

import com.example.ims.dto.TrainingCourseRequest;
import com.example.ims.dto.TrainingMetricsResponse;
import com.example.ims.dto.TrainingRecordRequest;
import com.example.ims.dto.UserQualificationRequest;
import com.example.ims.entity.*;
import com.example.ims.service.TrainingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 🎓 교육훈련 및 자격관리 (Training & Competence) REST 컨트롤러.
 * ISO 13485:2016 §6.2, ISO 22716 §3 및 화장품법 제3조·제7조 준수.
 */
@RestController
@RequestMapping("/api/training")
@RequiredArgsConstructor
public class TrainingController {

    private final TrainingService service;

    // =========================================================================
    // 1. 교육과정 마스터 (Courses)
    // =========================================================================

    @GetMapping("/courses")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<TrainingCourse>> getCourses(
            @RequestParam(required = false) TrainingCategory category,
            @RequestParam(required = false) ProductFamily targetFamily,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.getCourses(category, targetFamily, status, keyword));
    }

    @GetMapping("/courses/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TrainingCourse> getCourseById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getCourseById(id));
    }

    @PostMapping("/courses")
    @PreAuthorize("@perm.can('trainingManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<TrainingCourse> createCourse(
            @Valid @RequestBody TrainingCourseRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCourse(request, username));
    }

    @PutMapping("/courses/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<TrainingCourse> updateCourse(
            @PathVariable Long id,
            @Valid @RequestBody TrainingCourseRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateCourse(id, request, username));
    }

    @DeleteMapping("/courses/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCourse(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteCourse(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 2. 교육이수 및 평가 기록 (Records)
    // =========================================================================

    @GetMapping("/records")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<TrainingRecord>> getRecords(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) TrainingCategory category,
            @RequestParam(required = false) TrainingCompletionStatus completionStatus,
            @RequestParam(required = false) EffectivenessEvaluation effectiveness,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.getRecords(courseId, category, completionStatus, effectiveness, department, keyword));
    }

    @GetMapping("/records/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TrainingRecord> getRecordById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getRecordById(id));
    }

    @PostMapping("/records")
    @PreAuthorize("@perm.can('trainingManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<TrainingRecord> createRecord(
            @Valid @RequestBody TrainingRecordRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRecord(request, username));
    }

    @PutMapping("/records/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<TrainingRecord> updateRecord(
            @PathVariable Long id,
            @Valid @RequestBody TrainingRecordRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateRecord(id, request, username));
    }

    @DeleteMapping("/records/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRecord(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteRecord(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 직무 자격 관리 (Qualifications)
    // =========================================================================

    @GetMapping("/qualifications")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<UserQualification>> getQualifications(
            @RequestParam(required = false) QualificationType type,
            @RequestParam(required = false) QualificationStatus status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.getQualifications(type, status, department, keyword));
    }

    @GetMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<UserQualification> getQualificationById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getQualificationById(id));
    }

    @PostMapping("/qualifications")
    @PreAuthorize("@perm.can('trainingManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<UserQualification> createQualification(
            @Valid @RequestBody UserQualificationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createQualification(request, username));
    }

    @PutMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<UserQualification> updateQualification(
            @PathVariable Long id,
            @Valid @RequestBody UserQualificationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateQualification(id, request, username));
    }

    @DeleteMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('trainingManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteQualification(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteQualification(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 4. 대시보드 KPI 서머리 지표
    // =========================================================================

    @GetMapping("/metrics")
    @PreAuthorize("@perm.can('trainingManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TrainingMetricsResponse> getMetrics() {
        return ResponseEntity.ok(service.getMetrics());
    }
}
