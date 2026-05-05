package com.example.ims.controller;

import com.example.ims.entity.Product;
import com.example.ims.entity.ProductHistory;
import com.example.ims.service.FileStorageService;
import com.example.ims.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;


import java.io.IOException;
import java.util.List;

/**
 * 제품 마스터 관리 컨트롤러.
 * [보안 강화] 모든 생성/수정/삭제 요청은 RBAC(Role-Based Access Control)을 통해 권한이 검증됩니다.
 * [데이터 무결성] @Valid 어노테이션을 통해 서버 측에서 2차 데이터 유효성 검사를 수행합니다.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ProductController {

    private final ProductService productService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<com.example.ims.dto.ProductSummaryRecord>> getProducts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        // 제품 목록 페이징 조회 수행
        return ResponseEntity.ok(productService.getProductsPaginated(userDetails.getUsername(), page, size));
    }

    @GetMapping("/ingredient-template")
    public ResponseEntity<byte[]> downloadIngredientTemplate() {
        try {
            byte[] excelFile = productService.generateIngredientTemplate();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Ingredient_Template.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelFile);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(productService.getProductById(id, userDetails.getUsername()).orElse(null));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES')")
    public ResponseEntity<Product> createProduct(@jakarta.validation.Valid @RequestBody Product product,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(productService.createProduct(product, userDetails.getUsername()));
    }

    @GetMapping("/check-duplicate/{itemCode}")
    public ResponseEntity<Boolean> checkDuplicate(@PathVariable String itemCode) {
        System.out.println("DEBUG: Checking duplicate for itemCode: " + itemCode);
        return ResponseEntity.ok(productService.checkItemCodeDuplicate(itemCode));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES')")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @jakarta.validation.Valid @RequestBody Product product,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(productService.updateProduct(id, product, userDetails.getUsername()));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES', 'QUALITY_TEAM')")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file,
                                             @RequestParam(value = "productName", required = false) String productName) {
        // 파일 업로드 및 저장 처리
        String fileName = fileStorageService.storeFile(file, productName);

        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(fileName)
                .toUriString();

        return ResponseEntity.ok(fileDownloadUri);
    }

    @PostMapping("/upload-ingredients")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES', 'QUALITY_TEAM')")
    public ResponseEntity<List<com.example.ims.dto.ProductIngredientDto>> uploadIngredientsFile(@RequestParam("file") MultipartFile file) {
        try {
            System.out.println("Processing Excel file for ingredients upload: " + file.getOriginalFilename());
            List<com.example.ims.dto.ProductIngredientDto> parsedIngredients = productService.parseIngredientsExcel(file);
            return ResponseEntity.ok(parsedIngredients);
        } catch (Exception e) {
            System.err.println("Error parsing Excel file: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }



    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        productService.deleteProduct(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> restoreProduct(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        productService.restoreProduct(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> hardDeleteProduct(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        productService.hardDeleteProduct(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ProductHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getHistory(id));
    }

    @GetMapping("/master/{itemCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES', 'QUALITY_TEAM')")
    public ResponseEntity<Product> loadMaster(@PathVariable String itemCode) {
        return ResponseEntity.ok(productService.loadMasterProduct(itemCode));
    }

    @GetMapping("/search")
    public ResponseEntity<org.springframework.data.domain.Page<com.example.ims.dto.ProductSummaryRecord>> search(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String englishProductName,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String ingredients,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity
                .ok(productService.searchProducts(userDetails.getUsername(), itemCode, productName, englishProductName, brand, manufacturer, ingredients, pageable));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','SALES','MANUFACTURER','RESPONSIBLE_SALES')")
    public ResponseEntity<byte[]> exportProducts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String englishProductName,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String ingredients) throws IOException {
        
        String username = userDetails.getUsername();
        log.info(">>>> [EXPORT] Product Excel - User: {}, Filters: itemCode={}, productName={}", username, itemCode, productName);
        
        try {
            byte[] excelFile = productService.exportProducts(username, itemCode, productName, englishProductName, brand, manufacturer, ingredients);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Product_Master_Export.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelFile);
        } catch (Exception e) {
            log.error(">>>> [EXPORT] [ERROR] Product Excel generation failed for user {}: {}", username, e.getMessage(), e);
            throw e;
        }
    }

}
