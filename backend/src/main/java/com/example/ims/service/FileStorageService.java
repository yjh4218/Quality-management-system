package com.example.ims.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.example.ims.entity.StoredFile;
import com.example.ims.repository.StoredFileRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;

/**
 * 파일 저장 및 관리 서비스.
 * [보안] MIME 타입 검증, Path Traversal 방지, 용량 재검증 로직 포함.
 * [영구 보존 & 캐시] 로컬 디스크 캐시 및 Supabase PostgreSQL(stored_files) 자동 동기화/자가 복구(Self-Healing).
 */
@Service
@Slf4j
public class FileStorageService {

    private final Path fileStorageLocation;
    private final AmazonS3 s3Client;
    private final StoredFileRepository storedFileRepository;
    private final Tika tika = new Tika();
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @Value("${storage.type:local}")
    private String storageType;

    @Value("${storage.s3.bucket:}")
    private String bucketName;

    public FileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir,
            @org.springframework.lang.Nullable AmazonS3 s3Client,
            @org.springframework.lang.Nullable StoredFileRepository storedFileRepository) {
        this.s3Client = s3Client;
        this.storedFileRepository = storedFileRepository;
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

            byte[] fileBytes = file.getBytes();
            saveToLocal(fileBytes, fileName);
            saveToDatabase(fileBytes, fileName, originalFileName, file.getContentType());

            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                uploadToS3(fileBytes, fileName, file.getContentType());
            }
            return fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    public String normalizeRelativePath(String path) {
        if (path == null) return "";
        String clean = path.trim().replace('\\', '/');
        while (clean.startsWith("/")) {
            clean = clean.substring(1);
        }
        if (clean.toLowerCase().startsWith("uploads/")) {
            clean = clean.substring("uploads/".length());
        }
        while (clean.startsWith("/")) {
            clean = clean.substring(1);
        }
        clean = StringUtils.cleanPath(clean);
        if (clean.contains("..")) {
            throw new SecurityException("보안 위험: 상위 디렉터리 접근(..)이 차단되었습니다.");
        }
        return clean;
    }

    private void saveToDatabase(byte[] data, String relativePath, String originalFileName, String contentType) {
        if (storedFileRepository == null || data == null || data.length == 0) return;
        try {
            String normalizedPath = normalizeRelativePath(relativePath);
            String detectedType = contentType;
            if (detectedType == null || detectedType.isBlank() || "application/octet-stream".equals(detectedType)) {
                try {
                    detectedType = tika.detect(data, originalFileName);
                } catch (Exception ignored) {}
            }
            StoredFile storedFile = StoredFile.builder()
                    .filePath(normalizedPath)
                    .fileName(originalFileName != null ? originalFileName : Paths.get(normalizedPath).getFileName().toString())
                    .contentType(detectedType)
                    .fileSize((long) data.length)
                    .fileData(data)
                    .build();
            storedFileRepository.save(storedFile);
            log.info("[FILE-PERSISTENCE] Stored in DB: {} ({} bytes)", normalizedPath, data.length);
        } catch (Exception e) {
            log.error("[FILE-PERSISTENCE-ERROR] Failed to save {} to DB: {}", relativePath, e.getMessage());
        }
    }

    public String storeFileBytes(byte[] bytes, String relativePath, String contentType, String originalName) {
        if (bytes == null || bytes.length == 0) {
            throw new RuntimeException("업로드할 파일 내용이 비어있습니다.");
        }
        if (bytes.length > MAX_FILE_SIZE) {
            throw new RuntimeException("보안 경고: 파일 크기가 허용 범위를 초과했습니다. (Max 10MB)");
        }
        try {
            String normalizedPath = normalizeRelativePath(relativePath);
            saveToLocal(bytes, normalizedPath);
            saveToDatabase(bytes, normalizedPath, originalName != null ? originalName : Paths.get(normalizedPath).getFileName().toString(), contentType);
            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                uploadToS3(bytes, normalizedPath, contentType);
            }
            return normalizedPath;
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + relativePath, e);
        }
    }

    private String uploadToS3(byte[] data, String fileName, String mimeType) throws IOException {
        ObjectMetadata metadata = new ObjectMetadata();
        String contentType = mimeType;
        if (contentType == null || contentType.isEmpty() || "application/octet-stream".equals(contentType)) {
            try {
                contentType = tika.detect(data, fileName);
            } catch (Exception ignored) {}
        }
        if (contentType == null || contentType.isEmpty()) {
            contentType = "application/octet-stream";
        }
        metadata.setContentType(contentType);
        metadata.setContentLength(data.length);

        // 비이미지 파일(PDF, 엑셀, Word, HWP 등)은 강제 다운로드(attachment) 설정
        boolean isImage = contentType.startsWith("image/") && !contentType.contains("svg");
        if (!isImage) {
            String safeHeaderFilename = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
            metadata.setContentDisposition("attachment; filename=\"" + safeHeaderFilename + "\"");
        } else {
            metadata.setContentDisposition("inline");
        }

        try (java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(data)) {
            s3Client.putObject(new PutObjectRequest(bucketName, fileName, bais, metadata));
        }
        return fileName;
    }

    private String saveToLocal(byte[] data, String fileName) throws IOException {
        String normalizedPath = normalizeRelativePath(fileName);
        Path targetLocation = this.fileStorageLocation.resolve(normalizedPath).normalize();
        if (!targetLocation.startsWith(this.fileStorageLocation)) {
            throw new RuntimeException("보안 위험: 지정된 업로드 경로를 벗어날 수 없습니다.");
        }
        if (targetLocation.getParent() != null && !Files.exists(targetLocation.getParent())) {
            Files.createDirectories(targetLocation.getParent());
        }

        Files.write(targetLocation, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return normalizedPath;
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

            saveToLocal(bytes, fileName);
            saveToDatabase(bytes, fileName, fileName, "image/png");
            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                uploadToS3(bytes, fileName, "image/png");
            }
            return fileName;
        } catch (Exception ex) {
            throw new RuntimeException("Could not store base64 image.", ex);
        }
    }

    public Resource loadResourceOrRestore(String relativePath) {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            return null;
        }
        try {
            String normalizedPath = normalizeRelativePath(relativePath);
            Path targetLocation = this.fileStorageLocation.resolve(normalizedPath).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                log.warn("[SECURITY] Path traversal attempt detected: {}", relativePath);
                return null;
            }

            // 1. Check local disk cache (fast path, 0 DB queries)
            if (Files.exists(targetLocation) && Files.isReadable(targetLocation)) {
                try {
                    return new UrlResource(targetLocation.toUri());
                } catch (MalformedURLException e) {
                    log.error("Malformed URL for existing file: {}", targetLocation, e);
                }
            }

            // 2. Cache miss: check DB and self-heal
            if (storedFileRepository != null) {
                try {
                    Optional<StoredFile> storedOpt = storedFileRepository.findById(normalizedPath);
                    if (storedOpt.isEmpty() && normalizedPath.contains("/")) {
                        String fileNameOnly = Paths.get(normalizedPath).getFileName().toString();
                        storedOpt = storedFileRepository.findById(fileNameOnly);
                    }

                    if (storedOpt.isPresent()) {
                        StoredFile stored = storedOpt.get();
                        byte[] data = stored.getFileData();
                        if (data != null && data.length > 0) {
                            if (targetLocation.getParent() != null && !Files.exists(targetLocation.getParent())) {
                                Files.createDirectories(targetLocation.getParent());
                            }
                            Files.write(targetLocation, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                            log.info("[SELF-HEALING] Restored file from DB to local disk: {} ({} bytes)", normalizedPath, data.length);
                            return new UrlResource(targetLocation.toUri());
                        }
                    }
                } catch (Exception e) {
                    log.error("[SELF-HEALING-ERROR] Failed to restore file from DB: {}", normalizedPath, e);
                }
            }

            // 3. Fallback: S3 check (if configured)
            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                try {
                    String fileName = Paths.get(normalizedPath).getFileName().toString();
                    if (s3Client.doesObjectExist(bucketName, fileName)) {
                        com.amazonaws.services.s3.model.S3Object s3Object = s3Client.getObject(bucketName, fileName);
                        try (var is = s3Object.getObjectContent()) {
                            if (targetLocation.getParent() != null && !Files.exists(targetLocation.getParent())) {
                                Files.createDirectories(targetLocation.getParent());
                            }
                            Files.copy(is, targetLocation, StandardCopyOption.REPLACE_EXISTING);
                            log.info("[SELF-HEALING] Restored file from S3 to local disk: {}", normalizedPath);
                            return new UrlResource(targetLocation.toUri());
                        }
                    }
                } catch (Exception e) {
                    log.error("[SELF-HEALING-ERROR] Failed to restore file from S3: {}", normalizedPath, e);
                }
            }
        } catch (Exception e) {
            log.warn("[FILE-LOAD-ERROR] Error loading resource {}: {}", relativePath, e.getMessage());
        }

        return null;
    }

    public boolean deleteFile(String fileName) {
        if (fileName == null || fileName.isEmpty()) return false;

        try {
            String normalizedPath = normalizeRelativePath(fileName);
            boolean deleted = false;
            if ("s3".equalsIgnoreCase(storageType) && s3Client != null) {
                try {
                    s3Client.deleteObject(bucketName, normalizedPath);
                    deleted = true;
                } catch (Exception e) {
                    log.warn("S3 delete failed for {}: {}", normalizedPath, e.getMessage());
                }
            }

            Path targetLocation = this.fileStorageLocation.resolve(normalizedPath).normalize();
            if (targetLocation.startsWith(this.fileStorageLocation)) {
                deleted = Files.deleteIfExists(targetLocation) || deleted;
            }

            if (storedFileRepository != null) {
                try {
                    storedFileRepository.deleteById(normalizedPath);
                    deleted = true;
                } catch (Exception e) {
                    log.warn("DB delete failed for {}: {}", normalizedPath, e.getMessage());
                }
            }
            return deleted;
        } catch (Exception e) {
            log.error("[FILE] Failed to delete file {}: {}", fileName, e.getMessage());
            return false;
        }
    }

    public java.util.Map<String, Object> getStorageStats() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        if (storedFileRepository != null) {
            long count = storedFileRepository.count();
            Long totalBytes = storedFileRepository.getTotalStorageSize();
            stats.put("totalFiles", count);
            stats.put("totalSizeBytes", totalBytes != null ? totalBytes : 0L);
            stats.put("totalSizeMB", String.format("%.2f MB", (totalBytes != null ? totalBytes : 0L) / (1024.0 * 1024.0)));
        }
        return stats;
    }

    /**
     * [영구 보존 초기 동기화] 로컬 디스크에 이미 존재하는 파일들을 비동기 백그라운드로 DB에 영구 백업합니다.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void syncExistingLocalFilesToDatabase() {
        if (storedFileRepository == null) return;
        new Thread(() -> {
            try {
                log.info("[FILE-SYNC] Starting scan of local upload directory for DB backup sync...");
                try (java.util.stream.Stream<Path> stream = Files.walk(this.fileStorageLocation)) {
                    stream.filter(Files::isRegularFile)
                            .filter(p -> !p.toString().contains("isolated"))
                            .forEach(path -> {
                                try {
                                    Path relPath = this.fileStorageLocation.relativize(path);
                                    String relativePathStr = relPath.toString().replace('\\', '/');
                                    String normalizedPath = normalizeRelativePath(relativePathStr);
                                    if (!storedFileRepository.existsById(normalizedPath)) {
                                        byte[] bytes = Files.readAllBytes(path);
                                        saveToDatabase(bytes, normalizedPath, path.getFileName().toString(), null);
                                    }
                                } catch (Exception e) {
                                    log.debug("[FILE-SYNC-SKIP] Skipped file {}: {}", path.getFileName(), e.getMessage());
                                }
                            });
                }
                log.info("[FILE-SYNC] Completed local upload directory sync to DB. Current status: {}", getStorageStats());
            } catch (Exception e) {
                log.warn("[FILE-SYNC-ERROR] Could not complete sync: {}", e.getMessage());
            }
        }, "FileStorageSyncThread").start();
    }
}
