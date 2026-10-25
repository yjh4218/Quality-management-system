package com.example.ims.service;

import com.example.ims.entity.AuditLog;
import com.example.ims.entity.Product;
import com.example.ims.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 01단계: 감사로그 보존 정책 및 데이터 복원 특성화 및 회귀 방어 테스트
 * (DEC-09: 기존 로직 100% 보존 및 결함 D-7, D-8 방어 검증)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuditLogPreservationTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private WmsInboundRepository wmsInboundRepository;
    @Mock
    private ProductionAuditRepository productionAuditRepository;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @Mock
    private AccessLogService accessLogService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    @DisplayName("[해결검증 D-8] archiveOldLogs 호출 시 아카이브 복제만 수행하고 원본 물리 삭제는 절대 호출되지 않음을 검증")
    void testArchiveOldLogs_BehaviorCharacterization() {
        when(auditLogRepository.archiveOldLogs(any(LocalDateTime.class))).thenReturn(5);

        assertDoesNotThrow(() -> auditLogService.archiveOldLogs());

        verify(auditLogRepository).archiveOldLogs(any(LocalDateTime.class));
        verify(auditLogRepository, never()).deleteArchivedLogs(any(LocalDateTime.class));
    }

    @Test
    @DisplayName("[해결검증 D-7] restoreFromLog 호출 시 원천 엔티티 덮어쓰기가 전면 차단되고 UnsupportedOperationException 발생 검증")
    void testRestoreFromLog_ProductRestoration() {
        assertThrows(UnsupportedOperationException.class, () -> auditLogService.restoreFromLog(1001L, "admin"));
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("[해결검증 D-6/무결성] log 호출 시 SHA-256 무결성 해시(recordHash)가 산출되어 저장됨을 검증")
    void testLog_RecordHashGenerated() {
        auditLogService.log("PRODUCT", 100L, "UPDATE", "tester", 1L, "tester", "테스터", "품질팀", "규격 변경", "old", "new", "detail");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();

        assertNotNull(saved.getRecordHash(), "감사 레코드의 무결성 해시가 생성되어야 함");
        assertEquals(64, saved.getRecordHash().length(), "SHA-256 해시 길이는 64자리여야 함");
        assertNotNull(saved.getModifiedAt());
    }
}
