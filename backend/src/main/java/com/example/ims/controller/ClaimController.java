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

import java.util.List;

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
            @RequestParam(required = false) String sharedWithManufacturer) {
        User user = getUser(userDetails);
        String roleStr = user.getRole();
        if (roleStr != null && !roleStr.startsWith("ROLE_")) {
            roleStr = "ROLE_" + roleStr;
        }
        
        System.out.println("DEBUG: Incoming Request with sharedFilter String = [" + sharedWithManufacturer + "]");
        
        return ResponseEntity.ok(claimService.searchClaims(roleStr, user.getCompanyName(), startDate, endDate, itemCode, productName, lotNumber, country, qualityStatus, claimNumber, sharedWithManufacturer));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Claim> getClaim(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(claimService.getClaim(id, getUser(userDetails)));
    }

    @GetMapping("/debug/status")
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

    @PutMapping("/{id}")
    public ResponseEntity<Claim> updateClaim(
            @PathVariable Long id, 
            @RequestBody Claim claim, 
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
    public ResponseEntity<List<ClaimHistory>> getClaimHistory(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.getClaimHistory(id));
    }

    @PostMapping("/{id}/upload-response")
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

        Claim claim = claimService.getClaim(id, getUser(userDetails));
        String fileName = fileStorageService.storeFile(file, productName != null ? productName : "claim_" + id);
        claim.setManufacturerResponsePdf("/uploads/" + fileName);
        claimService.saveClaim(claim);
        
        return ResponseEntity.ok("/uploads/" + fileName);
    }

    @PostMapping("/upload-photo")
    public ResponseEntity<String> uploadPhoto(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("파일 크기는 5MB를 초과할 수 없습니다.");
        }

        String fileName = fileStorageService.storeFile(file, "claim_photo_" + System.currentTimeMillis());
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
            @RequestParam(required = false) String sharedWithManufacturer) throws java.io.IOException {
        
        String username = userDetails.getUsername();
        log.info(">>>> [EXPORT] Claim Excel - User: {}", username);
        
        try {
            User user = getUser(userDetails);
            String roleStr = user.getRole();
            if (roleStr != null && !roleStr.startsWith("ROLE_")) {
                roleStr = "ROLE_" + roleStr;
            }
    
            byte[] excelFile = claimService.exportClaims(username, roleStr, user.getCompanyName(), startDate, endDate, itemCode, productName, lotNumber, country, qualityStatus, claimNumber, sharedWithManufacturer);
            
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Claim_Export.xlsx")
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelFile);
        } catch (Exception e) {
            log.error(">>>> [EXPORT] [ERROR] Claim Excel failed for user {}: {}", username, e.getMessage(), e);
            throw e;
        }
    }
}
