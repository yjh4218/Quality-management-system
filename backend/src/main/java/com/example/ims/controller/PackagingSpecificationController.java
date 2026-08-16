package com.example.ims.controller;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.service.PackagingSpecExportService;
import com.example.ims.dto.PackagingSpecFullDto;
import com.example.ims.service.PackagingSpecService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/packaging-specs")
@RequiredArgsConstructor
public class PackagingSpecificationController {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final PackagingSpecExportService exportService;
    private final PackagingSpecService specService;

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<PackagingSpecification>> getSpecsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(specRepository.findByProductId(productId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<PackagingSpecification> saveSpec(@RequestBody PackagingSpecification spec,
            @AuthenticationPrincipal UserDetails userDetails) {
        spec.setLastModifiedBy(userDetails.getUsername());
        
        List<PackagingSpecification> existingSpecs = specRepository.findByProductId(spec.getProduct().getId());
        
        PackagingSpecification latestSpec = null;
        int maxVersion = 0;
        for (PackagingSpecification existing : existingSpecs) {
            if (existing.getVersion() != null && existing.getVersion() > maxVersion) {
                maxVersion = existing.getVersion();
                latestSpec = existing;
            }
        }
        
        spec.setVersion(maxVersion + 1);
        
        if (latestSpec == null) {
            spec.setRevisionNotes("최초 등록");
        } else {
            StringBuilder notes = new StringBuilder();
            
            String oldText = latestSpec.getPackagingMethodText() == null ? "" : latestSpec.getPackagingMethodText();
            String newText = spec.getPackagingMethodText() == null ? "" : spec.getPackagingMethodText();
            if (!oldText.equals(newText)) {
                notes.append("포장방법 기재내용 변경");
            }
            
            String oldImg = latestSpec.getPackagingMethodImage() == null ? "" : latestSpec.getPackagingMethodImage();
            String newImg = spec.getPackagingMethodImage() == null ? "" : spec.getPackagingMethodImage();
            
            if (!oldImg.equals(newImg)) {
                if (notes.length() > 0) notes.append(", ");
                if (oldImg.isEmpty()) {
                    notes.append("포장방법 사진 추가");
                } else if (newImg.isEmpty()) {
                    notes.append("포장방법 사진 삭제");
                } else {
                    notes.append("포장방법 사진 변경");
                }
            }
            
            if (notes.length() == 0) {
                notes.append("내용 변경 없음 (단순 재저장)");
            }
            
            spec.setRevisionNotes(notes.toString());
        }
        
        PackagingSpecification savedSpec = specRepository.save(spec);
        
        if (existingSpecs.size() >= 5) {
            existingSpecs.sort((a,b) -> {
                int vA = a.getVersion() == null ? 0 : a.getVersion();
                int vB = b.getVersion() == null ? 0 : b.getVersion();
                return Integer.compare(vA, vB);
            });
            int numToDelete = existingSpecs.size() - 4;
            for (int i = 0; i < numToDelete; i++) {
                specRepository.delete(existingSpecs.get(i));
            }
        }
        
        return ResponseEntity.ok(savedSpec);
    }

    @GetMapping("/master-copy/{itemCode}")
    public ResponseEntity<PackagingSpecification> getMasterSpecTemplate(@PathVariable String itemCode) {
        return productRepository.findByItemCode(itemCode)
                .map((Product p) -> {
                    List<PackagingSpecification> specs = specRepository.findByProductId(p.getId());
                    if (specs.isEmpty())
                        return ResponseEntity.notFound().<PackagingSpecification>build().getBody();
                    // Return the first one as template (or logic to find 'master' spec)
                    PackagingSpecification template = specs.get(0);
                    return PackagingSpecification.builder()
                            .packagingMethodText(template.getPackagingMethodText())
                            .packagingMethodImage(template.getPackagingMethodImage())
                            .build();
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint to download the Packaging Specification as an Excel (.xlsx) file.
     * 엑셀 파일 포맷으로 포장사양서를 다운로드합니다.
     */
    @GetMapping("/export-excel/{productId}")
    public ResponseEntity<Resource> exportToExcel(@PathVariable Long productId) {
        try {
            Product product = productRepository.findById(productId).orElse(null);
            String itemCode = product != null && product.getItemCode() != null ? product.getItemCode() : String.valueOf(productId);
            byte[] excelBytes = exportService.generateExcel(productId);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            String encodedFilename = java.net.URLEncoder.encode("포장사양서_" + itemCode + ".xlsx", java.nio.charset.StandardCharsets.UTF_8.name())
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint to download the Packaging Specification as a PDF file.
     * PDF 파일 포맷으로 포장사양서를 다운로드합니다.
     */
    @GetMapping("/export-pdf/{productId}")
    public ResponseEntity<Resource> exportToPdf(@PathVariable Long productId) {
        try {
            Product product = productRepository.findById(productId).orElse(null);
            String itemCode = product != null && product.getItemCode() != null ? product.getItemCode() : String.valueOf(productId);
            byte[] pdfBytes = exportService.generatePdf(productId);
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            String encodedFilename = java.net.URLEncoder.encode("포장사양서_" + itemCode + ".pdf", java.nio.charset.StandardCharsets.UTF_8.name())
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/full/product/{productId}")
    public ResponseEntity<PackagingSpecFullDto> getFullSpecByProduct(@PathVariable Long productId) {
        try {
            PackagingSpecFullDto fullDto = specService.getFullSpecByProductId(productId);
            return ResponseEntity.ok(fullDto);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/save-full")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<PackagingSpecFullDto> saveFullSpec(@RequestBody PackagingSpecFullDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String username = userDetails != null ? userDetails.getUsername() : "system";
            PackagingSpecFullDto saved = specService.saveFullSpec(dto, username);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            e.printStackTrace();
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, 
                e.getMessage(), e
            );
        } catch (Exception e) {
            e.printStackTrace();
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, 
                "포장사양서 저장 중 오류 발생: " + e.getMessage(), e
            );
        }
    }

    @GetMapping("/product-info/{itemCode}")
    public ResponseEntity<Product> getProductInfoByItemCode(@PathVariable String itemCode) {
        return productRepository.findByItemCode(itemCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- PackagingMethodImage REST APIs ---

    @Autowired
    private com.example.ims.repository.PackagingMethodImageRepository methodImageRepository;

    @Autowired
    private com.example.ims.service.FileStorageService fileStorageService;

    @GetMapping("/{specId}/method-images")
    public ResponseEntity<List<com.example.ims.entity.PackagingMethodImage>> getMethodImages(@PathVariable Long specId) {
        List<com.example.ims.entity.PackagingMethodImage> activeList = methodImageRepository.findActiveBySpecId(specId);
        log.info(">>>> [METHOD-IMAGES] GET specId={}, activeCount={}", specId, activeList.size());
        return ResponseEntity.ok(activeList);
    }

    @PostMapping("/{specId}/method-images/batch-upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<List<com.example.ims.entity.PackagingMethodImage>> batchUploadMethodImages(
            @PathVariable Long specId,
            @RequestParam("files") org.springframework.web.multipart.MultipartFile[] files,
            @RequestParam(value = "insertAfterId", required = false) Long insertAfterId) {
        
        log.info(">>>> [METHOD-IMAGES] BATCH-UPLOAD START specId={}, filesCount={}", specId, files != null ? files.length : 0);
        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().build();
        }

        // 1회 20장 제한 및 파일형식 확인
        if (files.length > 20) {
            throw new RuntimeException("1회 업로드 제한(20장)을 초과했습니다.");
        }

        for (org.springframework.web.multipart.MultipartFile file : files) {
            String orig = file.getOriginalFilename();
            if (orig == null) continue;
            String lower = orig.toLowerCase();
            if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".png") && !lower.endsWith(".webp")) {
                throw new RuntimeException("지원하지 않는 이미지 포맷입니다. (jpg, png, webp만 허용)");
            }
            if (file.getSize() > 10 * 1024 * 1024) {
                throw new RuntimeException("파일 크기 제한(10MB)을 초과하는 이미지가 있습니다.");
            }
        }

        List<com.example.ims.entity.PackagingMethodImage> activeImages = methodImageRepository.findActiveBySpecId(specId);
        
        double insertOrder = 1000.0;
        if (insertAfterId != null) {
            int targetIdx = -1;
            for (int i = 0; i < activeImages.size(); i++) {
                if (activeImages.get(i).getId().equals(insertAfterId)) {
                    targetIdx = i;
                    break;
                }
            }
            if (targetIdx != -1) {
                if (targetIdx == activeImages.size() - 1) {
                    insertOrder = activeImages.get(targetIdx).getDisplayOrder() + 1000.0;
                } else {
                    double prevOrder = activeImages.get(targetIdx).getDisplayOrder();
                    double nextOrder = activeImages.get(targetIdx + 1).getDisplayOrder();
                    insertOrder = (prevOrder + nextOrder) / 2.0;
                }
            }
        } else {
            if (!activeImages.isEmpty()) {
                insertOrder = activeImages.get(activeImages.size() - 1).getDisplayOrder() + 1000.0;
            }
        }

        List<com.example.ims.entity.PackagingMethodImage> uploadedList = new java.util.ArrayList<>();
        double step = 1000.0;
        if (insertAfterId != null && activeImages.size() > 1) {
            step = 1.0; // insert within existing items
        }

        double currentOrder = insertOrder;
        for (org.springframework.web.multipart.MultipartFile file : files) {
            try {
                String storedFileName = fileStorageService.storeFile(file, com.example.ims.util.UploadType.GENERAL, "pkg_method");
                String fileUrl = "/uploads/" + storedFileName;

                String currentUsername = "admin";
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                    currentUsername = auth.getName();
                }

                com.example.ims.entity.PackagingMethodImage img = com.example.ims.entity.PackagingMethodImage.builder()
                        .packagingSpecId(specId)
                        .imageUrl(fileUrl)
                        .imagePath(fileUrl)
                        .displayOrder(currentOrder)
                        .layoutWidthPx(400)
                        .layoutHeightPx(300)
                        .createdBy(currentUsername)
                        .build();

                uploadedList.add(methodImageRepository.save(img));
                currentOrder += step;
            } catch (Exception e) {
                // 개별 업로드 진행률 지원 및 일부 실패 시에도 로깅 후 진행
                e.printStackTrace();
            }
        }

        return ResponseEntity.ok(uploadedList);
    }

    @PutMapping("/method-images/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<com.example.ims.entity.PackagingMethodImage> updateMethodImage(
            @PathVariable Long id,
            @RequestBody com.example.ims.entity.PackagingMethodImage updateDto) {
        
        com.example.ims.entity.PackagingMethodImage existing = methodImageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Image not found"));

        if (updateDto.getDisplayOrder() != null) {
            existing.setDisplayOrder(updateDto.getDisplayOrder());
        }
        if (updateDto.getLayoutWidthPx() != null) {
            existing.setLayoutWidthPx(updateDto.getLayoutWidthPx());
        }
        if (updateDto.getLayoutHeightPx() != null) {
            existing.setLayoutHeightPx(updateDto.getLayoutHeightPx());
        }
        if (updateDto.getAnnotationsJson() != null) {
            existing.setAnnotationsJson(updateDto.getAnnotationsJson());
        }
        if (updateDto.getCaptionText() != null) {
            existing.setCaptionText(updateDto.getCaptionText());
        }
        if (updateDto.getThumbnailUrl() != null) {
            existing.setThumbnailUrl(updateDto.getThumbnailUrl());
        }

        return ResponseEntity.ok(methodImageRepository.save(existing));
    }

    @DeleteMapping("/method-images/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<Void> deleteMethodImage(@PathVariable Long id) {
        com.example.ims.entity.PackagingMethodImage existing = methodImageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Image not found"));
        existing.setDeletedAt(java.time.LocalDateTime.now());
        methodImageRepository.save(existing);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{targetSpecId}/method-images/copy-from/{sourceSpecId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<List<com.example.ims.entity.PackagingMethodImage>> copyFromMasterSpec(
            @PathVariable Long targetSpecId,
            @PathVariable Long sourceSpecId) {
        log.info(">>>> [METHOD-IMAGES] COPY-FROM-MASTER targetSpecId={}, sourceSpecId={}", targetSpecId, sourceSpecId);
        List<com.example.ims.entity.PackagingMethodImage> sourceImages = methodImageRepository.findActiveBySpecId(sourceSpecId);
        if (sourceImages.isEmpty()) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }

        String currentUsername = "admin";
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            currentUsername = auth.getName();
        }

        List<com.example.ims.entity.PackagingMethodImage> copiedList = new java.util.ArrayList<>();
        for (com.example.ims.entity.PackagingMethodImage src : sourceImages) {
            com.example.ims.entity.PackagingMethodImage copy = com.example.ims.entity.PackagingMethodImage.builder()
                    .packagingSpecId(targetSpecId)
                    .imageUrl(src.getImageUrl())
                    .imagePath(src.getImagePath())
                    .thumbnailUrl(src.getThumbnailUrl())
                    .displayOrder(src.getDisplayOrder())
                    .layoutWidthPx(src.getLayoutWidthPx())
                    .layoutHeightPx(src.getLayoutHeightPx())
                    .annotationsJson(src.getAnnotationsJson())
                    .captionText(src.getCaptionText())
                    .createdBy(currentUsername)
                    .build();
            copiedList.add(methodImageRepository.save(copy));
        }

        return ResponseEntity.ok(copiedList);
    }

    @PostMapping("/method-images/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<com.example.ims.entity.PackagingMethodImage> restoreMethodImage(@PathVariable Long id) {
        com.example.ims.entity.PackagingMethodImage existing = methodImageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Image not found"));
        existing.setDeletedAt(null);
        return ResponseEntity.ok(methodImageRepository.save(existing));
    }
}
