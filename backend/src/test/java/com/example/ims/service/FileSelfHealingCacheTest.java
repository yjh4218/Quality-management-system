package com.example.ims.service;

import com.example.ims.entity.StoredFile;
import com.example.ims.repository.StoredFileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * [배포 환경 파일 영구 보존 및 자가 복구 캐시 단위 테스트]
 */
public class FileSelfHealingCacheTest {

    @TempDir
    Path tempUploadDir;

    private StoredFileRepository storedFileRepository;
    private FileStorageService fileStorageService;

    @BeforeEach
    public void setUp() {
        storedFileRepository = mock(StoredFileRepository.class);
        fileStorageService = new FileStorageService(tempUploadDir.toString(), null, storedFileRepository);
    }

    @Test
    public void testStoreAndSelfHealingRestore() throws IOException {
        String testContent = "Hello QMS Self Healing File!";
        byte[] testBytes = testContent.getBytes();
        String relativePath = "test_image.png";

        // 1. Mock DB 저장소 동작
        StoredFile mockStored = StoredFile.builder()
                .filePath(relativePath)
                .fileName("test_image.png")
                .contentType("image/png")
                .fileSize((long) testBytes.length)
                .fileData(testBytes)
                .build();
        when(storedFileRepository.findById(relativePath)).thenReturn(Optional.of(mockStored));

        // 2. storeFileBytes 호출 검증
        String savedPath = fileStorageService.storeFileBytes(testBytes, relativePath, "image/png", "test_image.png");
        assertEquals(relativePath, savedPath);
        verify(storedFileRepository, timeout(3000).times(1)).save(any(StoredFile.class));

        // 3. 로컬 디스크 파일 생성 확인
        Path localFile = tempUploadDir.resolve(relativePath);
        assertTrue(Files.exists(localFile), "Local file should exist after store");

        // 4. 로컬 디스크 파일 강제 삭제 (컨테이너 재부팅/슬립 시뮬레이션)
        Files.delete(localFile);
        assertFalse(Files.exists(localFile), "Local file should be deleted to simulate container restart");

        // 5. loadResourceOrRestore 호출 -> Self-Healing으로 자동 복구되는지 검증
        Resource restoredResource = fileStorageService.loadResourceOrRestore(relativePath);
        assertNotNull(restoredResource, "Restored resource should not be null");
        assertTrue(restoredResource.exists(), "Restored resource should exist");
        assertTrue(Files.exists(localFile), "Local file should have been re-created by self-healing cache");
        assertArrayEquals(testBytes, Files.readAllBytes(localFile), "Restored content must match original bytes");
    }

    @Test
    public void testNonExistentFileReturnsNull() {
        when(storedFileRepository.findById(anyString())).thenReturn(Optional.empty());
        Resource result = fileStorageService.loadResourceOrRestore("non_existent_file.pdf");
        assertNull(result, "Missing file should return null without throwing exception");
    }
}
