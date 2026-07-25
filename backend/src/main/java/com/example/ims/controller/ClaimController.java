package com.example.ims.controller;

import com.example.ims.dto.ClaimDashboardDto;
import com.example.ims.entity.Claim;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.ClaimService;
import com.example.ims.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.ims.entity.ClaimHistory;
import org.springframework.security.access.prepost.PreAuthorize;
import com.example.ims.util.UploadType;

import java.util.List;

/**
 * 클레임(Claim) 관리 컨트롤러.
 * [보안 강화] 제조사와 본사 간의 데이터 접근 권한을 엄격히 분리하며, 상태 변경 및 파일 업로드 시 RBAC 권한을 검증합니다.
 */
@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ClaimController {

    private final ClaimService claimService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    private User getUser(UserDetails userDetails) {
        return userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private String getEffectiveCompanyName(User user) {
        if (user == null) return null;
        if (user.getManufacturer() != null) {
            return user.getManufacturer().getName();
        }
        return user.getCompanyName();
    }

    @GetMapping
    public ResponseEntity<List<Claim>> getClaims(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String qualityStatus,
            @RequestParam(required = false) String claimNumber,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String sharedWithManufacturer,
            @RequestParam(required = false) Boolean isCriticalClaim) {
        User user = getUser(userDetails);
        String roleStr = user.getRole();
        if (roleStr != null && !roleStr.startsWith("ROLE_")) {
            roleStr = "ROLE_" + roleStr;
        }
        
        String effectiveCompany = getEffectiveCompanyName(user);

        return ResponseEntity.ok(claimService.searchClaims(roleStr, effectiveCompany, startDate, endDate, itemCode, productName, lotNumber, country, qualityStatus, claimNumber, manufacturer, sharedWithManufacturer, isCriticalClaim));
    }

    @GetMapping("/paged")
    public ResponseEntity<org.springframework.data.domain.Page<Claim>> getClaimsPaged(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String qualityStatus,
            @RequestParam(required = false) String claimNumber,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String sharedWithManufacturer,
            @RequestParam(required = false) Boolean isCriticalClaim,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        User user = getUser(userDetails);
        String roleStr = user.getRole();
        if (roleStr != null && !roleStr.startsWith("ROLE_")) {
            roleStr = "ROLE_" + roleStr;
        }
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("receiptDate").descending());

        String effectiveCompany = getEffectiveCompanyName(user);

        return ResponseEntity.ok(claimService.searchClaimsPaged(
            roleStr, effectiveCompany, startDate, endDate, itemCode, productName,
            lotNumber, country, qualityStatus, claimNumber, manufacturer,
            sharedWithManufacturer, isCriticalClaim, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Claim> getClaim(
            @PathVariable Long id, 
            @RequestParam(required = false, defaultValue = "false") boolean fromEmail,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(claimService.getClaim(id, getUser(userDetails), fromEmail));
    }

    @GetMapping("/debug/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getDebugStatus() {
        List<Claim> all = claimService.getClaims(null, null); 
        long total = all.size();
        long shared = all.stream().filter(Claim::isSharedWithManufacturer).count();
        
        java.util.Map<String, Object> status = new java.util.HashMap<>();
        status.put("totalCount", total);
        status.put("sharedCount", shared);
        status.put("nonSharedCount", total - shared);
        status.put("timestamp", new java.util.Date().toString());
        return ResponseEntity.ok(status);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ClaimDashboardDto> getDashboardStats(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String manufacturer) {
        User user = getUser(userDetails);
        String standardizedRole = user.getRole();
        if (standardizedRole != null && !standardizedRole.startsWith("ROLE_")) {
            standardizedRole = "ROLE_" + standardizedRole;
        }
        return ResponseEntity.ok(claimService.getDashboardStats(standardizedRole, user.getCompanyName(), startDate, endDate, itemCode, productName, manufacturer));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteClaim(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        claimService.deleteClaim(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<java.util.Map<String, Object>> sendEmailToManufacturer(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> emailRequest,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        try {
            boolean isMock = claimService.sendCustomEmailToManufacturer(id, emailRequest, user);
            java.util.Map<String, Object> res = new java.util.HashMap<>();
            res.put("success", true);
            res.put("isMock", isMock);
            res.put("message", isMock ? "SMTP_NOT_CONFIGURED" : "EMAIL_SENT");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            log.error("Failed to send email for claim {}", id, e);
            java.util.Map<String, Object> errorRes = new java.util.HashMap<>();
            errorRes.put("success", false);
            errorRes.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorRes);
        }
    }

    @GetMapping("/{id}/email-preview")
    public ResponseEntity<java.util.Map<String, Object>> getClaimEmailPreview(
            @PathVariable Long id,
            @RequestParam String templateCode) {
        try {
            return ResponseEntity.ok(claimService.getClaimEmailPreview(id, templateCode));
        } catch (Exception e) {
            log.error("Failed to generate email preview for claim {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES', 'MANUFACTURER')")
    public ResponseEntity<Claim> updateClaim(
            @PathVariable Long id, 
            @jakarta.validation.Valid @RequestBody Claim claim, 
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User user = getUser(userDetails);
        String modifierName = user.getName() != null ? user.getName() : user.getUsername();
        
        System.out.println("DEBUG: Incoming update request for Claim ID: " + id + " by " + modifierName);
        System.out.println("DEBUG: Received Claim Data: " + claim);
        
        try {
            // [수정] ClaimService.updateClaim 시 User 객체를 직접 전달하여 타입 불일치 및 오류 해결
            Claim updated = claimService.updateClaim(id, claim, user);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR: Failed to update claim ID " + id);
            e.printStackTrace();
            // 에러 메시지를 포함하여 500 응답 발생
            throw new RuntimeException("현재 시스템 내부 검증 중 예기치 못한 상태 오류가 감지되었습니다: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<List<ClaimHistory>> getClaimHistory(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.getClaimHistory(id));
    }

    @PostMapping("/{id}/upload-response")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'MANUFACTURER')")
    public ResponseEntity<String> uploadResponse(@PathVariable Long id,
                                                 @RequestParam("file") MultipartFile file,
                                                 @RequestParam(value = "productName", required = false) String productName,
                                                 @AuthenticationPrincipal UserDetails userDetails) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("파일 크기는 5MB를 초과할 수 없습니다.");
        }


        Claim claim = claimService.getClaim(id, getUser(userDetails), false);
        String prefix = claim.getClaimNumber() != null ? claim.getClaimNumber() : "claim_" + id;
        String fileName = fileStorageService.storeFile(file, UploadType.CLAIM_ATTACHMENT, prefix);
        claim.setManufacturerResponsePdf("/uploads/" + fileName);
        claimService.saveClaim(claim);
        
        return ResponseEntity.ok("/uploads/" + fileName);
    }

    @PostMapping("/upload-photo")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES', 'MANUFACTURER')")
    public ResponseEntity<String> uploadPhoto(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("파일 크기는 5MB를 초과할 수 없습니다.");
        }

        String fileName = fileStorageService.storeFile(file, UploadType.CLAIM_ATTACHMENT, "claim_photo");
        return ResponseEntity.ok("/uploads/" + fileName);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','SALES','MANUFACTURER','RESPONSIBLE_SALES')")
    public ResponseEntity<byte[]> exportClaims(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String qualityStatus,
            @RequestParam(required = false) String claimNumber,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String sharedWithManufacturer,
            @RequestParam(required = false) Boolean isCriticalClaim) throws java.io.IOException {
        
        String username = userDetails.getUsername();
        log.info(">>>> [EXPORT] Claim Excel - User: {}", username);
        
        try {
            User user = getUser(userDetails);
            String roleStr = user.getRole();
            if (roleStr != null && !roleStr.startsWith("ROLE_")) {
                roleStr = "ROLE_" + roleStr;
            }
    
            byte[] excelFile = claimService.exportClaims(username, roleStr, user.getCompanyName(), startDate, endDate, itemCode, productName, lotNumber, country, qualityStatus, claimNumber, manufacturer, sharedWithManufacturer, isCriticalClaim);
            
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Claim_Export.xlsx")
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelFile);
        } catch (Exception e) {
            log.error(">>>> [EXPORT] [ERROR] Claim Excel failed for user {}: {}", username, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/{id}/re-request")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY')")
    public ResponseEntity<Claim> reRequestCriticalCapa(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String reason = body.get("reason");
        return ResponseEntity.ok(claimService.reRequestCriticalCapa(id, reason, userDetails.getUsername()));
    }
}
