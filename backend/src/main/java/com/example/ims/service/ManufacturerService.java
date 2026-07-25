package com.example.ims.service;

import com.example.ims.entity.Manufacturer;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.example.ims.dto.ManufacturerScorecardDto;
import com.example.ims.entity.ManufacturerAudit;
import com.example.ims.entity.Claim;
import com.example.ims.repository.ManufacturerAuditRepository;
import com.example.ims.repository.ClaimRepository;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ManufacturerService {

    private final ManufacturerRepository manufacturerRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ManufacturerAuditRepository manufacturerAuditRepository;
    private final ClaimRepository claimRepository;

    @Transactional(readOnly = true)
    public ManufacturerScorecardDto getScorecard(Long manufacturerId) {
        Manufacturer mfr = getById(manufacturerId);
        
        // 1. Audit scores
        List<ManufacturerAudit> audits = manufacturerAuditRepository.findByManufacturerId(manufacturerId);
        double avgAuditScore = 100.0;
        if (!audits.isEmpty()) {
            double total = audits.stream().mapToDouble(ManufacturerAudit::getTotalScore).sum();
            avgAuditScore = total / audits.size();
        }

        // 2. Claim counts within 1 year
        LocalDate oneYearAgo = LocalDate.now().minusYears(1);
        List<Claim> claims = claimRepository.findByManufacturer(mfr.getName());
        int recentClaimCount = (int) claims.stream()
                .filter(c -> c.getReceiptDate() != null && c.getReceiptDate().isAfter(oneYearAgo))
                .count();

        // 3. Deductions (2 points per claim, max deduction 30)
        double claimDeduction = Math.min(recentClaimCount * 2.0, 30.0);

        // 4. Final Score & Grade
        double finalScore = Math.max(avgAuditScore - claimDeduction, 0.0);
        String grade = "D";
        if (finalScore >= 90.0) grade = "A";
        else if (finalScore >= 80.0) grade = "B";
        else if (finalScore >= 70.0) grade = "C";

        return ManufacturerScorecardDto.builder()
                .manufacturerId(manufacturerId)
                .manufacturerName(mfr.getName())
                .auditCount(audits.size())
                .averageAuditScore(avgAuditScore)
                .claimCount(recentClaimCount)
                .claimDeduction(claimDeduction)
                .finalScore(finalScore)
                .grade(grade)
                .build();
    }

    public List<Manufacturer> getAll(String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found"));

        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        
        return manufacturerRepository.findAll().stream()
                .filter(m -> m.isActive() && !m.isDeleted())
                .filter(m -> {
                    if (isManufacturer) {
                        return m.getName().equals(user.getCompanyName());
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    public org.springframework.data.domain.Page<Manufacturer> getAllPaged(String username, org.springframework.data.domain.Pageable pageable) {
        return manufacturerRepository.findByActiveTrueAndIsDeletedFalse(pageable);
    }

    @Transactional
    public Manufacturer save(Manufacturer manufacturer, String username) {
        if (manufacturer.getFiles() != null) {
            manufacturer.getFiles().forEach(file -> file.setManufacturer(manufacturer));
        }
        
        boolean isNew = manufacturer.getId() == null;
        Manufacturer oldManufacturer = isNew ? null : getById(manufacturer.getId());
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        
        String action = isNew ? "CREATE" : "UPDATE";
        String description = (isNew ? "신규 제조사 등록: " : "제조사 정보 수정: ") + saved.getName();
        
        auditLogService.logEntityChange("MANUFACTURER", saved.getId(), action, username, 
                null, username, null, null,
                description, oldManufacturer, saved);
        return saved;
    }

    @Transactional
    public void delete(Long id, String username) {
        Manufacturer manufacturer = getById(id);
        String oldJson = auditLogService.toCompactJson(manufacturer);
        manufacturer.setActive(false);
        manufacturer.setDeleted(true);
        manufacturer.setDeletedAt(java.time.LocalDateTime.now());
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "DELETE", username, 
                null, username, null, null,
                "제조사 삭제(비활성화): " + manufacturer.getName(), oldJson, saved);
    }

    @Transactional
    public void restore(Long id, String username) {
        Manufacturer manufacturer = getById(id);
        manufacturer.setDeleted(false);
        manufacturer.setDeletedAt(null);
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "RESTORE", username, 
                null, username, null, null,
                "제조사 복구: " + manufacturer.getName(), manufacturer, saved);
    }

    @Transactional
    public void hardDelete(Long id, String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(
                         "User not found"));
        if (!user.getRole().contains("ADMIN")) {
            throw new RuntimeException("완전 삭제 권한이 없습니다. (관리자 전용)");
        }
        Manufacturer manufacturer = getById(id);
        manufacturerRepository.delete(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "HARD_DELETE", username, 
                null, username, null, null,
                "제조사 완전 삭제: " + manufacturer.getName(), manufacturer, null);
    }

    public Manufacturer getById(Long id) {
        return manufacturerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Manufacturer not found"));
    }

    public java.util.Map<String, List<String>> getCompanyDepartmentsAndEmails(String companyName) {
        java.util.Map<String, List<String>> deptMap = new java.util.HashMap<>();
        if (companyName == null || companyName.isBlank()) {
            return deptMap;
        }
        List<com.example.ims.entity.User> users = userRepository.findByCompanyName(companyName);
        for (com.example.ims.entity.User u : users) {
            if (u.isEnabled()) {
                String dept = u.getDepartment();
                if (dept == null || dept.isBlank()) {
                    dept = "기타";
                }
                String email = u.getEmail();
                if (email != null && !email.isBlank()) {
                    deptMap.computeIfAbsent(dept, k -> new java.util.ArrayList<>()).add(email);
                }
            }
        }
        return deptMap;
    }
}
