package com.example.ims.controller;

import com.example.ims.entity.DocumentRequestLog;
import com.example.ims.entity.DocumentRequirement;
import com.example.ims.service.DocumentRequestService;
import com.example.ims.service.FileStorageService;
import com.example.ims.util.UploadType;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 제조사 공개 서류 제출 및 토큰 정보 조회 컨트롤러.
 * [보안 개선] Rate Limiting은 RateLimitFilter 전역 필터에서 통합 관리하며,
 * 내부 예외 메시지 직접 노출을 방지하고 캡슐화된 메시지를 제공합니다.
 */
@RestController
@RequestMapping("/api/vendor-upload")
public class VendorUploadController {

    private static final Logger log = LoggerFactory.getLogger(VendorUploadController.class);

    private final DocumentRequestService requestService;
    private final FileStorageService fileStorageService;

    public VendorUploadController(DocumentRequestService requestService, FileStorageService fileStorageService) {
        this.requestService = requestService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * 제조사 업로드 토큰 유효성 검증 및 서류 제출 기본 메타데이터 반환 API
     */
    @GetMapping("/{token}/info")
    public ResponseEntity<?> getVendorTargetInfo(@PathVariable String token) {
        try {
            DocumentRequestLog logEntity = requestService.verifyUploadToken(token);
            DocumentRequirement req = logEntity.getRequirement();

            TargetInfoResponse res = new TargetInfoResponse();
            res.setToken(token);

            if (req.getDocumentEnumType() != null) {
                res.setDocumentName(req.getDocumentEnumType().getDescription());
            } else if (req.getCustomDocumentType() != null) {
                res.setDocumentName(req.getCustomDocumentType().getName());
            } else {
                res.setDocumentName("미지정 서류");
            }

            if (req.getProductId() != null) {
                res.setTargetType("PRODUCT");
                res.setTargetName(req.getProduct() != null ? req.getProduct().getProductName() : "-");
                res.setItemCode(req.getProduct() != null ? req.getProduct().getItemCode() : "-");
                if (req.getProduct() != null && req.getProduct().getManufacturerInfo() != null) {
                    res.setManufacturerName(req.getProduct().getManufacturerInfo().getName());
                } else {
                    res.setManufacturerName("-");
                }
            } else {
                res.setTargetType("MANUFACTURER");
                res.setTargetName(req.getManufacturer() != null ? req.getManufacturer().getName() : "-");
                res.setManufacturerName(req.getManufacturer() != null ? req.getManufacturer().getName() : "-");
            }

            return ResponseEntity.ok(res);
        } catch (IllegalStateException e) {
            log.warn("[VENDOR-UPLOAD-INFO] Expired upload token used: {}", token);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body("{\"error\": \"Expired Link\", \"message\": \"만료되었거나 이미 사용된 요청 링크입니다.\"}");
        } catch (Exception e) {
            log.error("[VENDOR-UPLOAD-INFO] Token verification failed for token '{}': {}", token, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Invalid Token\", \"message\": \"유효하지 않은 업로드 요청 링크입니다.\"}");
        }
    }

    /**
     * 제조사 공개 업로드 전용 파일 서브밋 API
     */
    @PostMapping("/{token}/file")
    public ResponseEntity<?> uploadVendorFile(
            @PathVariable String token,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"업로드할 파일이 비어 있습니다.\"}");
        }

        try {
            DocumentRequestLog logEntity = requestService.verifyUploadToken(token);
            DocumentRequirement req = logEntity.getRequirement();

            String prefix = "vendor_spec_" + req.getId();
            String fileName = fileStorageService.storeFile(file, UploadType.GENERAL, prefix);
            String uploadedFileUrl = "/uploads/" + fileName;

            requestService.fulfillDocumentRequest(token, uploadedFileUrl);

            return ResponseEntity.ok().body("{\"message\": \"제출이 완료되었습니다. 감사합니다.\"}");
        } catch (IllegalStateException e) {
            log.warn("[VENDOR-UPLOAD-FILE] Expired token attempt during file submit: {}", token);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body("{\"error\": \"Expired Link\", \"message\": \"만료되었거나 이미 사용된 요청 링크입니다.\"}");
        } catch (Exception e) {
            log.error("[VENDOR-UPLOAD-FILE] File upload failed for token '{}': {}", token, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Upload Failed\", \"message\": \"파일 제출 처리에 실패했습니다. 잠시 후 다시 시도해 주십시오.\"}");
        }
    }

    public static class TargetInfoResponse {
        private String token;
        private String documentName;
        private String targetType;
        private String targetName;
        private String itemCode;
        private String manufacturerName;

        public TargetInfoResponse() {}

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getDocumentName() { return documentName; }
        public void setDocumentName(String documentName) { this.documentName = documentName; }
        public String getTargetType() { return targetType; }
        public void setTargetType(String targetType) { this.targetType = targetType; }
        public String getTargetName() { return targetName; }
        public void setTargetName(String targetName) { this.targetName = targetName; }
        public String getItemCode() { return itemCode; }
        public void setItemCode(String itemCode) { this.itemCode = itemCode; }
        public String getManufacturerName() { return manufacturerName; }
        public void setManufacturerName(String manufacturerName) { this.manufacturerName = manufacturerName; }
    }
}
