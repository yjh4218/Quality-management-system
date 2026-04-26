package com.example.ims.controller;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.service.PackagingSpecExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/packaging-specs")
@RequiredArgsConstructor
public class PackagingSpecificationController {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final PackagingSpecExportService exportService;

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<PackagingSpecification>> getSpecsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(specRepository.findByProductId(productId));
    }

    @PostMapping
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
            byte[] excelBytes = exportService.generateExcel(productId);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=packaging_spec_" + productId + ".xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);
        } catch (Exception e) {
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
            byte[] pdfBytes = exportService.generatePdf(productId);
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=packaging_spec_" + productId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
