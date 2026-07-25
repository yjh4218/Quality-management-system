package com.example.ims.controller;

import com.example.ims.entity.Product;
import com.example.ims.entity.ProductTestReport;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.ProductTestReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductTestReportController {

    @Autowired
    private ProductTestReportRepository testReportRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/{id}/test-reports")
    public ResponseEntity<List<ProductTestReport>> getTestReports(@PathVariable Long id) {
        List<ProductTestReport> reports = testReportRepository.findByProductIdAndIsDeletedFalse(id);
        return ResponseEntity.ok(reports);
    }

    @PostMapping("/{id}/test-reports")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> addTestReport(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Product not found"));
        }

        ProductTestReport report = new ProductTestReport();
        report.setProduct(product);
        report.setReportName(payload.get("reportName"));
        report.setFileName(payload.get("fileName"));
        report.setFilePath(payload.get("filePath"));
        report.setFileType(payload.get("fileType"));

        testReportRepository.save(report);
        return ResponseEntity.ok(Map.of("success", true, "data", report));
    }

    @DeleteMapping("/test-reports/{reportId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> deleteTestReport(@PathVariable Long reportId) {
        ProductTestReport report = testReportRepository.findById(reportId).orElse(null);
        if (report != null) {
            report.setIsDeleted(true);
            report.setDeletedAt(LocalDateTime.now());
            testReportRepository.save(report);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
