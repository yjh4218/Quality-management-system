package com.example.ims.controller;

import com.example.ims.entity.*;
import com.example.ims.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 마스터 데이터 관리 API (Feature 2, 3, 4, 11)
 */
@RestController
@RequestMapping("/api/admin/master-data")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataService masterDataService;
    private final com.example.ims.service.BomCategoryService bomCategoryService;
    private final com.example.ims.service.FileStorageService fileStorageService;

    // --- Common Uploads ---
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "prefix", required = false, defaultValue = "MASTER") String prefix) {
        String fileName = fileStorageService.storeFile(file, prefix);
        String fileDownloadUri = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(fileName)
                .toUriString();
        return ResponseEntity.ok(fileDownloadUri);
    }

    // --- Templates (Feature 2) ---
    @GetMapping("/templates")
    public ResponseEntity<List<PackagingMethodTemplate>> getTemplates() {
        return ResponseEntity.ok(masterDataService.getAllTemplates());
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<PackagingMethodTemplate> saveTemplate(
            @RequestBody PackagingMethodTemplate template,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(masterDataService.saveTemplate(template, userDetails.getUsername()));
    }

    // --- Rules (Feature 3, 4) ---
    @GetMapping("/rules")
    public ResponseEntity<List<ChannelPackagingRule>> getRules() {
        return ResponseEntity.ok(masterDataService.getAllRules());
    }

    @PostMapping("/rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<ChannelPackagingRule> saveRule(
            @RequestBody ChannelPackagingRule rule,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(masterDataService.saveRule(rule, userDetails.getUsername()));
    }

    // --- Materials (Feature 11) ---
    @GetMapping("/materials")
    public ResponseEntity<List<MasterPackagingMaterial>> getMaterials(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(masterDataService.getAllMaterials(userDetails.getUsername()));
    }

    @PostMapping("/materials")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<MasterPackagingMaterial> saveMaterial(
            @RequestBody MasterPackagingMaterial material,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(masterDataService.saveMaterial(material, userDetails.getUsername()));
    }

    @GetMapping("/materials/search")
    public ResponseEntity<List<MasterPackagingMaterial>> searchMaterials(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String bomCode,
            @RequestParam(required = false) String componentName,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String detailedType,
            @RequestParam(required = false) String detailedMaterial,
            @RequestParam(required = false) String manufacturer) {
        return ResponseEntity.ok(masterDataService.searchMaterials(userDetails.getUsername(), bomCode, componentName, type, detailedType, detailedMaterial, manufacturer));
    }

    @GetMapping("/materials/check-bom-code")
    public ResponseEntity<Boolean> checkBomCode(@RequestParam String bomCode) {
        return ResponseEntity.ok(masterDataService.checkBomCodeExists(bomCode));
    }

    // --- BOM Categories ---
    @GetMapping("/bom-categories/active")
    public ResponseEntity<?> getActiveBomCategories() {
        try {
            return ResponseEntity.ok(bomCategoryService.getAllActiveCategories());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/bom-categories/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllBomCategories() {
        try {
            return ResponseEntity.ok(bomCategoryService.getAllCategories());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/bom-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> saveBomCategory(@RequestBody BomCategory category, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(bomCategoryService.saveCategory(category, userDetails.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Save Error: " + e.getMessage());
        }
    }

    // --- Channel Stickers (Feature 8) ---
    @GetMapping("/stickers")
    public ResponseEntity<List<ChannelStickerImage>> getStickers() {
        return ResponseEntity.ok(masterDataService.getAllStickers());
    }

    @PostMapping("/stickers")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<ChannelStickerImage> saveSticker(
            @RequestBody ChannelStickerImage sticker,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(masterDataService.saveSticker(sticker, userDetails.getUsername()));
    }
}
