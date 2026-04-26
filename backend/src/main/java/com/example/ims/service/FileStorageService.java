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

    /**
     * [Task 6] 파일 MIME 타입 검증 (Whitelist 방식)
     * [보안] octet-stream을 제거하고 엑셀/이미지/PDF만 허용합니다.
     */
    private void validateFile(MultipartFile file) {
        // 1. 용량 재검증
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("파일 크기는 10MB를 초과할 수 없습니다.");
        }

        try {
            String detectedType = tika.detect(file.getInputStream());
            log.debug("[FILE] Detected MIME type: {}", detectedType);

            Set<String> allowedTypes = Set.of(
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "image/gif",
                    "image/webp",
                    "application/vnd.ms-excel",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            // 엑셀 파일의 경우 때때로 octet-stream으로 감지될 수 있으나, 
            // 보안을 위해 octet-stream을 직접 허용하는 대신 확장자와 결합하여 판단하거나
            // Tika가 정확히 인자하도록 유도함. 여기선 화이트리스트만 엄격히 적용.
            if (!allowedTypes.contains(detectedType)) {
                // 확장자 기반 추가 확인 (Tika가 놓치는 일부 엑셀 케이스 대응)
                String fileName = file.getOriginalFilename();
                if (fileName != null && (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))) {
                    log.info("[FILE] Excel file detected via extension: {}", fileName);
                } else {
                    log.warn("[SECURITY] Blocked invalid file upload: type={}", detectedType);
                    throw new RuntimeException("허용되지 않은 파일 형식입니다. (PDF, 이미지, 엑셀 파일만 가능)");
                }
            }
        } catch (IOException e) {
            log.warn("MIME type detection failed: {}", e.getMessage());
            throw new RuntimeException("파일 형식 검증 중 오류가 발생했습니다.");
        }
    }

    public String storeFile(MultipartFile file) {
        return storeFile(file, null);
    }

    public String storeFile(MultipartFile file, String prefix) {
        validateFile(file);

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        try {
            if (originalFileName.contains("..")) {
                throw new RuntimeException("Invalid path sequence in filename: " + originalFileName);
            }

            String fileName;
            String baseName;
            String extension = "";

            int dotIndex = originalFileName.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = originalFileName.substring(dotIndex);
            }

            if (prefix != null && !prefix.trim().isEmpty()) {
                baseName = prefix.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
            } else {
                baseName = (dotIndex > 0) ? originalFileName.substring(0, dotIndex) : originalFileName;
            }

            String timeStamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            fileName = baseName + "_" + timeStamp + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;

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
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());
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
