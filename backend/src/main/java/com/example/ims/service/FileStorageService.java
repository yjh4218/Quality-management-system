package com.example.ims.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.Set;

/**
 * 파일 저장 및 관리 서비스.
 * [보안] MIME 타입 검증, Path Traversal 방지, 용량 재검증 로직 포함.
 */
@Service
@Slf4j
public class FileStorageService {

    private final Path fileStorageLocation;
    private final AmazonS3 s3Client;
    private final Tika tika = new Tika();
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @Value("${storage.type:local}")
    private String storageType;

    @Value("${storage.s3.bucket:}")
    private String bucketName;

    public FileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir,
            @org.springframework.lang.Nullable AmazonS3 s3Client) {
        this.s3Client = s3Client;
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @jakarta.annotation.PostConstruct
    public void initAndQuarantineExistingSvgFiles() {
        try {
            Path isolatedDir = this.fileStorageLocation.resolve("isolated");
            if (!Files.exists(isolatedDir)) {
                Files.createDirectories(isolatedDir);
            }

            try (java.util.stream.Stream<Path> stream = Files.walk(this.fileStorageLocation, 1)) {
                stream.filter(Files::isRegularFile)
                        .filter(path -> {
                            String name = path.getFileName().toString().toLowerCase();
                            if (name.endsWith(".svg") || name.endsWith(".xml")) {
                                return true;
                            }
                            try {
                                String type = tika.detect(path);
                                return type.equalsIgnoreCase("image/svg+xml") || type.contains("xml");
                            } catch (Exception e) {
                                return false;
                            }
                        })
                        .forEach(path -> {
                            try {
                                Path target = isolatedDir.resolve(path.getFileName());
                                Files.move(path, target, StandardCopyOption.REPLACE_EXISTING);
                                log.warn("[SECURITY QUARANTINE] Isolated malicious/SVG file: {} -> {}", path.getFileName(), target);
                            } catch (Exception e) {
                                log.error("[SECURITY QUARANTINE FAILED] Could not isolate file {}: {}", path.getFileName(), e.getMessage());
                            }
                        });
            }
        } catch (Exception e) {
            log.error("[SECURITY QUARANTINE ERROR] Failed during SVG scan: {}", e.getMessage());
        }
    }

    /**
     * [Task 6 & 보안 강화] 파일 MIME 타입 및 무결성 검증 (Whitelist 방식)
     * [보안] SVG/XML 차단, 실행 파일 및 알 수 없는 바이너리(octet-stream) 차단
     */
    private void validateFile(MultipartFile file) {
        // 1. 서비스 레이어 용량 재검증 (10MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("보안 경고: 파일 크기가 허용 범위를 초과했습니다. (Max 10MB)");
        }

        try {
            // Tika를 이용한 실제 컨텐츠 분석
            String detectedType = tika.detect(file.getInputStream());
            log.debug("[SECURITY] Content detection: {}", detectedType);

            // [보안] SVG / XML 저장형 XSS 시도 즉시 차단 (image/ 시작 검사보다 먼저 실행)
            if (detectedType != null) {
                String lowerType = detectedType.toLowerCase();
                if (lowerType.contains("svg") || lowerType.contains("xml")) {
                    log.warn("[SECURITY] Blocked SVG/XML XSS upload attempt: {}", detectedType);
                    throw new RuntimeException("보안 경고: SVG 및 XML 파일 업로드는 XSS 위험으로 금지되어 있습니다.");
                }
            }

            // 파일명 확장자 기반 차단 선 검증
            String originalName = file.getOriginalFilename();
            if (originalName != null) {
                String lowerName = originalName.toLowerCase();
                if (lowerName.endsWith(".svg") || lowerName.endsWith(".xml") || lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
                    log.warn("[SECURITY] Blocked dangerous extension attempt: {}", originalName);
                    throw new RuntimeException("보안 경고: 허용되지 않는 파일 확장자입니다. (.svg, .xml 등 불가)");
                }
            }

            Set<String> safeTypes = Set.of(
                    "application/pdf",
                    "image/jpeg", "image/png", "image/gif", "image/webp",
                    "application/vnd.ms-excel",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/x-hwp", "application/haansofthwp",
                    "application/x-tika-msoffice", "application/x-tika-ooxml",
                    "application/zip" // Tika sometimes detects .docx/.xlsx as zip
            );

            // 2. MIME 타입 검증
            if (!safeTypes.contains(detectedType) && !detectedType.startsWith("image/")) {
                // Tika가 파일 타입을 잘못 식별하는 경우가 많으므로 확장자 기반 검증
                try {
                    validateByExtension(file.getOriginalFilename());
                    log.info("[FILE] Allowed file with MIME type '{}' based on extension fallback.", detectedType);
                } catch (Exception extEx) {
                    log.warn("[SECURITY] Blocked malicious file type: {} (Extension check failed: {})", detectedType, extEx.getMessage());
                    throw new RuntimeException("허용되지 않은 파일 규격입니다. (PDF, 이미지, 엑셀, Word, HWP만 가능)");
                }
            }
        } catch (IOException e) {
            log.error("[SECURITY] File validation failed: {}", e.getMessage());
            throw new RuntimeException("파일 무결성 검증 중 오류가 발생했습니다.");
        }
    }

    /**
     * 확장자 이중 검증 (MIME 추론 실패 시 보조 수단)
     */
    private void validateByExtension(String originalFilename) {
        if (originalFilename == null) throw new RuntimeException("파일명이 존재하지 않습니다.");
        String ext = originalFilename.toLowerCase();
        if (ext.endsWith(".svg") || ext.endsWith(".xml") || ext.endsWith(".html") || ext.endsWith(".htm")) {
            throw new RuntimeException("보안 위험: SVG 및 XML/HTML 파일은 업로드할 수 없습니다.");
        }

        Set<String> allowedExtensions = Set.of(".xlsx", ".xls", ".doc", ".docx", ".hwp", ".pdf",
                ".jpg", ".jpeg", ".png", ".gif", ".webp");
        boolean allowed = allowedExtensions.stream().anyMatch(ext::endsWith);
        if (!allowed) {
            throw new RuntimeException("보안 위험: 허용되지 않은 파일 형식입니다.");
        }
    }

    public String storeFile(MultipartFile file) {
        return storeFile(file, com.example.ims.util.UploadType.GENERAL, null, null);
    }

    public String storeFile(MultipartFile file, String prefix) {
        return storeFile(file, com.example.ims.util.UploadType.GENERAL, prefix, null);
    }

    public String storeFile(MultipartFile file, com.example.ims.util.UploadType uploadType, String prefix) {
        return storeFile(file, uploadType, prefix, null);
    }

    public String storeFile(MultipartFile file, com.example.ims.util.UploadType uploadType, String prefix, String extraInfo) {
        validateFile(file);

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        try {
            if (originalFileName.contains("..")) {
                throw new RuntimeException("Invalid path sequence in filename: " + originalFileName);
            }

            String extension = "";
            int dotIndex = originalFileName.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = originalFileName.substring(dotIndex).toLowerCase();
            }

            // 파일명 길이 제한 및 특수문자 제거
            String safePrefix = "";
            if (prefix != null && !prefix.trim().isEmpty()) {
                safePrefix = prefix.replaceAll("[\\\\/:*?\"<>|\\s]", "_").trim();
                if (safePrefix.length() > 50) {
                    safePrefix = safePrefix.substring(0, 50);
                }
            }

            String safeExtra = "";
            if (extraInfo != null && !extraInfo.trim().isEmpty()) {
                safeExtra = extraInfo.replaceAll("[\\\\/:*?\"<>|\\s]", "_").trim();
                if (safeExtra.length() > 50) {
                    safeExtra = safeExtra.substring(0, 50);
                }
            }

            String timeStamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String uuidPart = UUID.randomUUID().toString().substring(0, 8);

            String fileName;
            switch (uploadType) {
                case AUDIT_PHOTO:
                    fileName = String.format("%s_사진감리_%s_%s%s", safePrefix, timeStamp, uuidPart, extension);
                    break;
                case TEST_REPORT:
                    String lot = safeExtra.isEmpty() ? "LOT" : safeExtra;
                    String dateOnly = timeStamp.substring(0, 8);
                    fileName = String.format("%s_%s_%s_%s%s", safePrefix, lot, dateOnly, uuidPart, extension);
                    break;
                case CLAIM_ATTACHMENT:
                    fileName = String.format("claim_%s_%s_%s%s", safePrefix, timeStamp, uuidPart, extension);
                    break;
                case MANUFACTURER_DOC:
                    String docType = safeExtra.isEmpty() ? "doc" : safeExtra;
                    String docDate = timeStamp.substring(0, 8);
                    fileName = String.format("%s_%s_%s_%s%s", safePrefix, docType, docDate, uuidPart, extension);
                    break;
                case COA_FILE:
                    fileName = String.format("coa_%s_%s_%s%s", safePrefix, timeStamp, uuidPart, extension);
                    break;
                default:
                    if (!safePrefix.isEmpty()) {
                        fileName = String.format("%s_%s_%s%s", safePrefix, timeStamp, uuidPart, extension);
                    } else {
                        String base = (dotIndex > 0) ? originalFileName.substring(0, dotIndex) : originalFileName;
                        if (base.length() > 50) base = base.substring(0, 50);
                        fileName = String.format("%s_%s_%s%s", base.replaceAll("[\\\\/:*?\"<>|\\s]", "_"), timeStamp, uuidPart, extension);
                    }
                    break;
            }

            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                return uploadToS3(file, fileName);
            } else {
                return saveToLocal(file, fileName);
            }
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    private String uploadToS3(MultipartFile file, String fileName) throws IOException {
        ObjectMetadata metadata = new ObjectMetadata();
        String contentType = tika.detect(file.getInputStream());
        if (contentType == null || contentType.isEmpty() || "application/octet-stream".equals(contentType)) {
            contentType = file.getContentType();
        }
        if (contentType == null || contentType.isEmpty()) {
            contentType = "application/octet-stream";
        }
        metadata.setContentType(contentType);
        metadata.setContentLength(file.getSize());

        // 비이미지 파일(PDF, 엑셀, Word, HWP 등)은 강제 다운로드(attachment) 설정
        boolean isImage = contentType.startsWith("image/") && !contentType.contains("svg");
        if (!isImage) {
            String safeHeaderFilename = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
            metadata.setContentDisposition("attachment; filename=\"" + safeHeaderFilename + "\"");
        } else {
            metadata.setContentDisposition("inline");
        }

        s3Client.putObject(new PutObjectRequest(bucketName, fileName, file.getInputStream(), metadata));
        return fileName;
    }

    private String saveToLocal(MultipartFile file, String fileName) throws IOException {
        // [Task 6] Path Traversal 방어
        Path targetLocation = this.fileStorageLocation.resolve(fileName).normalize();
        if (!targetLocation.startsWith(this.fileStorageLocation)) {
            throw new RuntimeException("보안 위험: 지정된 업로드 경로를 벗어날 수 없습니다.");
        }

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        return fileName;
    }

    public boolean deleteFile(String fileName) {
        if (fileName == null || fileName.isEmpty()) return false;

        try {
            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                s3Client.deleteObject(bucketName, fileName);
                return true;
            } else {
                Path targetLocation = this.fileStorageLocation.resolve(fileName).normalize();
                if (!targetLocation.startsWith(this.fileStorageLocation)) {
                    log.error("[SECURITY] Attempted to delete file outside upload zone: {}", fileName);
                    return false;
                }
                return Files.deleteIfExists(targetLocation);
            }
        } catch (Exception e) {
            log.error("[FILE] Failed to delete file {}: {}", fileName, e.getMessage());
            return false;
        }
    }
}
