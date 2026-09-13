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
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".xlsx", ".xls", ".doc", ".docx", ".hwp", ".pdf",
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
    );

    private static final Set<String> DANGEROUS_MIME_TYPES = Set.of(
            "application/x-msdownload", "application/x-executable", "application/x-sh",
            "application/x-bat", "application/x-msdos-program", "application/javascript",
            "text/javascript", "text/html", "application/xhtml+xml", "application/x-php",
            "application/x-httpd-php", "application/java-archive"
    );

    /**
     * [Task 6 & 보안 강화 S-5] 파일 MIME 타입 및 무결성 검증 (Strict Whitelist 방식)
     * [보안] SVG/XML 차단, 실행 파일 및 알 수 없는 스크립트 차단, 확장자 사전 검증 강제
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("업로드할 파일이 비어있습니다.");
        }

        // 1. 서비스 레이어 용량 재검증 (10MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("보안 경고: 파일 크기가 허용 범위를 초과했습니다. (Max 10MB)");
        }

        // 2. 확장자 사전 엄격 검증 (Whitelist)
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.trim().isEmpty()) {
            throw new RuntimeException("파일명이 존재하지 않습니다.");
        }
        validateByExtension(originalName);

        try {
            // 3. Tika를 이용한 실제 컨텐츠 매직 넘버/MIME 분석
            String detectedType = tika.detect(file.getInputStream());
            log.debug("[SECURITY] Content detection: {}", detectedType);

            if (detectedType != null) {
                String lowerType = detectedType.toLowerCase();

                // 위험 MIME 타입 또는 SVG/XML/스크립트 즉시 차단
                if (lowerType.contains("svg") || lowerType.contains("xml") || lowerType.contains("html")
                        || DANGEROUS_MIME_TYPES.contains(lowerType)) {
                    log.warn("[SECURITY] Blocked dangerous file upload attempt: {} (MIME: {})", originalName, detectedType);
                    throw new RuntimeException("보안 경고: 허용되지 않는 위험 파일 형식입니다. (MIME: " + detectedType + ")");
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

            // 4. MIME 타입 허용 목록 또는 안전한 이미지 확인
            if (detectedType != null && !safeTypes.contains(detectedType) && !detectedType.startsWith("image/")) {
                log.warn("[SECURITY] Blocked unrecognized MIME type: {} for file: {}", detectedType, originalName);
                throw new RuntimeException("허용되지 않은 파일 규격입니다. (PDF, 이미지, 엑셀, Word, HWP만 가능)");
            }
        } catch (IOException e) {
            log.error("[SECURITY] File validation failed: {}", e.getMessage());
            throw new RuntimeException("파일 무결성 검증 중 오류가 발생했습니다.");
        }
    }

    /**
     * 확장자 이중 검증 (MIME 추론 전/후 필수 검증)
     */
    private void validateByExtension(String originalFilename) {
        if (originalFilename == null) throw new RuntimeException("파일명이 존재하지 않습니다.");
        String ext = originalFilename.toLowerCase();
        if (ext.endsWith(".svg") || ext.endsWith(".xml") || ext.endsWith(".html") || ext.endsWith(".htm") || ext.endsWith(".exe") || ext.endsWith(".sh")) {
            throw new RuntimeException("보안 위험: 실행 파일, 스크립트 및 SVG/XML 파일은 업로드할 수 없습니다.");
        }

        boolean allowed = ALLOWED_EXTENSIONS.stream().anyMatch(ext::endsWith);
        if (!allowed) {
            throw new RuntimeException("보안 위험: 허용되지 않은 파일 확장자입니다. (허용: xlsx, docx, pdf, jpg, png, webp 등)");
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

        String rawFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload_file";
        String originalFileName = StringUtils.cleanPath(rawFilename);
        try {
            if (originalFileName.contains("..") || originalFileName.contains("/") || originalFileName.contains("\\")) {
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

    public String storeBase64Image(String base64Data, String prefix) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            throw new RuntimeException("Base64 image data is empty.");
        }
        try {
            String cleanData = base64Data;
            if (cleanData.contains(",")) {
                cleanData = cleanData.substring(cleanData.indexOf(",") + 1);
            }
            byte[] bytes = java.util.Base64.getDecoder().decode(cleanData.trim());

            String safePrefix = (prefix != null && !prefix.trim().isEmpty())
                    ? prefix.replaceAll("[\\\\/:*?\"<>|\\s]", "_").trim() : "img";
            String timeStamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String uuidPart = UUID.randomUUID().toString().substring(0, 8);
            String fileName = String.format("%s_%s_%s.png", safePrefix, timeStamp, uuidPart);

            Path targetLocation = this.fileStorageLocation.resolve(fileName).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                throw new RuntimeException("보안 위험: 지정된 업로드 경로를 벗어날 수 없습니다.");
            }

            Files.write(targetLocation, bytes);
            return fileName;
        } catch (Exception ex) {
            throw new RuntimeException("Could not store base64 image.", ex);
        }
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
