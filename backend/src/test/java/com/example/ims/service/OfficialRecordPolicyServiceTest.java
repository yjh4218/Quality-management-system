package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ElectronicSignatureRepository;
import com.example.ims.repository.OfficialRecordPolicyRepository;
import com.example.ims.repository.Part11AssessmentItemRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficialRecordPolicyServiceTest {

    @Mock
    private ElectronicSignatureRepository signatureRepository;

    @Mock
    private Part11AssessmentItemRepository part11Repository;

    @Mock
    private OfficialRecordPolicyRepository policyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private OfficialRecordPolicyService policyService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("admin")
                .password("$2a$10$encodedPasswordSample")
                .name("관리자")
                .department("품질경영팀")
                .position("책임연구원")
                .role("ROLE_ADMIN")
                .enabled(true)
                .build();
    }

    @Test
    @DisplayName("[20단계 Guard 1 통과] 21 CFR Part 11 비밀번호 재인증 성공 시 전자서명 정상 발행 및 해시 생성")
    void createSignature_success() {
        // given
        ElectronicSignatureRequest req = ElectronicSignatureRequest.builder()
                .documentType("RELEASE")
                .targetId(101L)
                .targetNumber("REL-20261025-001")
                .targetTitle("완제품 출하승인 판정서")
                .signatureMeaning(SignatureMeaning.QUALITY_AUTHORITY)
                .signatureReason("시험성적서 적합 확인에 따른 출하 인가")
                .password("validPassword123")
                .reauthMethod(SignatureReauthMethod.PASSWORD)
                .build();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("validPassword123", "$2a$10$encodedPasswordSample")).thenReturn(true);
        when(signatureRepository.save(any(ElectronicSignature.class))).thenAnswer(invocation -> {
            ElectronicSignature s = invocation.getArgument(0);
            s.setId(1L);
            return s;
        });

        // when
        ElectronicSignatureResponse res = policyService.createSignature(req, "admin", "127.0.0.1", "Mozilla/5.0");

        // then
        assertThat(res).isNotNull();
        assertThat(res.getSignatureNumber()).startsWith("SIG-");
        assertThat(res.getSignerFullName()).isEqualTo("관리자");
        assertThat(res.getSignerDepartment()).isEqualTo("품질경영팀");
        assertThat(res.getSignatureMeaning()).isEqualTo(SignatureMeaning.QUALITY_AUTHORITY);
        assertThat(res.getSignatureHash()).hasSize(64);
        assertThat(res.getManifestJson()).contains("QUALITY_AUTHORITY");
        assertThat(res.getIsIntegrityValid()).isTrue();

        verify(signatureRepository, times(1)).save(any(ElectronicSignature.class));
    }

    @Test
    @DisplayName("[20단계 Guard 1 차단] 21 CFR Part 11 비밀번호 불일치 시 전자서명 발행 원천 차단 (대리 서명 방지)")
    void createSignature_reauthFail() {
        // given
        ElectronicSignatureRequest req = ElectronicSignatureRequest.builder()
                .documentType("CAPA")
                .targetId(50L)
                .signatureMeaning(SignatureMeaning.APPROVER)
                .password("wrongPassword")
                .build();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongPassword", "$2a$10$encodedPasswordSample")).thenReturn(false);

        // when & then
        assertThatThrownBy(() -> policyService.createSignature(req, "admin", "127.0.0.1", "Chrome"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("21 CFR Part 11 §11.200 재인증 실패");

        verify(signatureRepository, never()).save(any(ElectronicSignature.class));
    }

    @Test
    @DisplayName("전자서명 철회(Revocation) 처리 검증")
    void revokeSignature_success() {
        // given
        ElectronicSignature sig = ElectronicSignature.builder()
                .id(1L)
                .signatureNumber("SIG-20261025-0001")
                .documentType("DOCUMENT")
                .targetId(200L)
                .isRevoked(false)
                .build();

        when(signatureRepository.findById(1L)).thenReturn(Optional.of(sig));

        // when
        ElectronicSignatureResponse res = policyService.revokeSignature(1L, "문서 개정으로 인한 서명 무효화", "admin");

        // then
        assertThat(res.getIsRevoked()).isTrue();
        assertThat(res.getRevocationReason()).isEqualTo("문서 개정으로 인한 서명 무효화");
        assertThat(res.getRevokedBy()).isEqualTo("admin");
        assertThat(res.getIsIntegrityValid()).isFalse();
    }

    @Test
    @DisplayName("21 CFR Part 11 자가평가 항목 CRUD 검증")
    void part11Assessment_crud() {
        // given
        Part11AssessmentItemRequest req = Part11AssessmentItemRequest.builder()
                .sectionCode("§11.10(a)")
                .requirementTitle("컴퓨터화 시스템 검증")
                .complianceStatus(Part11ComplianceStatus.COMPLIANT)
                .implementationSummary("CSV 밸리데이션 프로토콜 준수")
                .displayOrder(1)
                .build();

        when(part11Repository.save(any(Part11AssessmentItem.class))).thenAnswer(invocation -> {
            Part11AssessmentItem item = invocation.getArgument(0);
            item.setId(10L);
            return item;
        });

        // when
        Part11AssessmentItemResponse res = policyService.createPart11Assessment(req, "admin");

        // then
        assertThat(res.getId()).isEqualTo(10L);
        assertThat(res.getSectionCode()).isEqualTo("§11.10(a)");
        assertThat(res.getComplianceStatus()).isEqualTo(Part11ComplianceStatus.COMPLIANT);
    }

    @Test
    @DisplayName("DEC-01 공식 원본 및 보존 정책 CRUD 검증")
    void policy_crud() {
        // given
        OfficialRecordPolicyRequest req = OfficialRecordPolicyRequest.builder()
                .policyCode("POL-REC-01")
                .policyTitle("완제품 출하승인서 공식 원본 규정")
                .recordCategory(RecordCategory.RELEASE_RECORD)
                .officialOriginalType(OfficialOriginalType.HYBRID)
                .retentionPeriodYears(10)
                .isHybridSignedPaperRequired(true)
                .build();

        when(policyRepository.save(any(OfficialRecordPolicy.class))).thenAnswer(invocation -> {
            OfficialRecordPolicy p = invocation.getArgument(0);
            p.setId(5L);
            return p;
        });

        // when
        OfficialRecordPolicyResponse res = policyService.createPolicy(req, "admin");

        // then
        assertThat(res.getId()).isEqualTo(5L);
        assertThat(res.getPolicyCode()).isEqualTo("POL-REC-01");
        assertThat(res.getOfficialOriginalType()).isEqualTo(OfficialOriginalType.HYBRID);
        assertThat(res.getIsHybridSignedPaperRequired()).isTrue();
    }

    @Test
    @DisplayName("공식 원본 및 전자서명 종합 KPI 지표 계산 검증")
    void getKpi_calculation() {
        // given
        when(signatureRepository.count()).thenReturn(25L);
        when(signatureRepository.countBySignatureMeaning(SignatureMeaning.QUALITY_AUTHORITY)).thenReturn(8L);

        when(part11Repository.count()).thenReturn(10L);
        when(part11Repository.countByComplianceStatus(Part11ComplianceStatus.COMPLIANT)).thenReturn(9L);

        when(policyRepository.countByIsActiveTrue()).thenReturn(6L);
        when(policyRepository.countByOfficialOriginalType(OfficialOriginalType.HYBRID)).thenReturn(3L);
        when(policyRepository.count()).thenReturn(6L);

        // when
        OfficialRecordsKpiResponse kpi = policyService.getKpi();

        // then
        assertThat(kpi.getTotalSignatures()).isEqualTo(25L);
        assertThat(kpi.getQualityAuthoritySignatures()).isEqualTo(8L);
        assertThat(kpi.getPart11ComplianceRate()).isEqualTo(90.0);
        assertThat(kpi.getActivePolicies()).isEqualTo(6L);
        assertThat(kpi.getHybridPolicyRate()).isEqualTo(50.0);
        assertThat(kpi.getIntegrityValidRate()).isEqualTo(100.0);
    }
}
