package com.example.ims.controller;

import com.example.ims.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * [배포 환경 파일/사진 전용 서빙 컨트롤러]
 * 로컬 디스크 캐시 및 Supabase DB 자가 복구(Self-Healing Cache)를 결합하여
 * 컨테이너 재시작 후에도 파일 유실 없이 0ms 고속 서빙을 보장합니다.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class FileServingController {

    private final FileStorageService fileStorageService;

    @GetMapping("/uploads/**")
    public ResponseEntity<Resource> serveUploadFile(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String decodedUri;
        try {
            decodedUri = URLDecoder.decode(requestUri, StandardCharsets.UTF_8);
        } catch (Exception e) {
            decodedUri = requestUri;
        }

        String relativePath = decodedUri;
        int uploadsIdx = decodedUri.indexOf("/uploads/");
        if (uploadsIdx != -1) {
            relativePath = decodedUri.substring(uploadsIdx + "/uploads/".length());
        } else if (decodedUri.startsWith("uploads/")) {
            relativePath = decodedUri.substring("uploads/".length());
        }

        // 역방향 프록시(Cloudflare/HuggingFace) 또는 브라우저 이중 인코딩 대비 보정
        if (relativePath.contains("%")) {
            try {
                relativePath = URLDecoder.decode(relativePath, StandardCharsets.UTF_8);
            } catch (Exception ignored) {}
        }

        // 보안: Path Traversal 차단
        if (relativePath.contains("..")) {
            log.warn("[SECURITY] Path traversal blocked: {}", relativePath);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Resource resource = fileStorageService.loadResourceOrRestore(relativePath);
        if (resource == null || !resource.exists()) {
            log.debug("[FILE-NOT-FOUND] Resource not found: {}", relativePath);
            return ResponseEntity.notFound().build();
        }

        try {
            long contentLength = resource.contentLength();
            long lastModified = resource.lastModified();
            String etag = "\"" + lastModified + "_" + contentLength + "\"";

            String ifNoneMatch = request.getHeader(HttpHeaders.IF_NONE_MATCH);
            if (ifNoneMatch != null && ifNoneMatch.equals(etag)) {
                return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
            }

            // MIME 타입 판별
            String contentType = null;
            try {
                Path filePath = Paths.get(resource.getURI());
                contentType = Files.probeContentType(filePath);
            } catch (Exception ignored) {}

            if (contentType == null) {
                contentType = request.getServletContext().getMimeType(relativePath);
            }
            if (contentType == null) {
                String lower = relativePath.toLowerCase();
                if (lower.endsWith(".png")) contentType = "image/png";
                else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
                else if (lower.endsWith(".webp")) contentType = "image/webp";
                else if (lower.endsWith(".gif")) contentType = "image/gif";
                else if (lower.endsWith(".pdf")) contentType = "application/pdf";
                else if (lower.endsWith(".xlsx")) contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                else contentType = "application/octet-stream";
            }

            // Content-Disposition 결정
            boolean isInlineMedia = contentType.startsWith("image/") || contentType.equals("application/pdf");
            String disposition;
            if (isInlineMedia) {
                disposition = "inline";
            } else {
                String safeFileName = Paths.get(relativePath).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
                disposition = "attachment; filename=\"" + safeFileName + "\"";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(contentLength);
            headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition);
            headers.set(HttpHeaders.CACHE_CONTROL, "public, max-age=86400, must-revalidate");
            headers.set(HttpHeaders.ETAG, etag);
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

            return new ResponseEntity<>(resource, headers, HttpStatus.OK);
        } catch (IOException e) {
            log.error("[FILE-SERVE-ERROR] Error serving file {}: {}", relativePath, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * [관리자 전용] 영구 저장소(Supabase DB) 사용 현황 조회
     */
    @GetMapping("/api/admin/system/storage-stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getStorageStats() {
        return ResponseEntity.ok(fileStorageService.getStorageStats());
    }
}
