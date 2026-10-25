package com.example.ims.service;

import com.example.ims.dto.TrainingCourseRequest;
import com.example.ims.dto.TrainingMetricsResponse;
import com.example.ims.dto.TrainingRecordRequest;
import com.example.ims.dto.UserQualificationRequest;
import com.example.ims.entity.*;
import com.example.ims.repository.TrainingCourseRepository;
import com.example.ims.repository.TrainingRecordRepository;
import com.example.ims.repository.UserQualificationRepository;
import com.example.ims.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingServiceTest {

    @Mock private TrainingCourseRepository courseRepository;
    @Mock private TrainingRecordRepository recordRepository;
    @Mock private UserQualificationRepository qualificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks private TrainingService service;

    private TrainingCourse sampleCourse;
    private TrainingRecord sampleRecord;
    private UserQualification sampleQualification;

    @BeforeEach
    void setUp() {
        sampleCourse = TrainingCourse.builder()
                .id(1L)
                .courseCode("TC-GMP-001")
                .courseName("의료기기 GMP 기본 및 오염관리")
                .category(TrainingCategory.GMP)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .targetAudience("생산/품질팀 전원")
                .cycleMonths(12)
                .passingScore(80)
                .trainingHours(4.0)
                .isRequired(true)
                .status("ACTIVE")
                .isDeleted(false)
                .build();

        sampleRecord = TrainingRecord.builder()
                .id(10L)
                .recordNo("TRR-202610-001")
                .courseId(1L)
                .courseCode("TC-GMP-001")
                .courseName("의료기기 GMP 기본 및 오염관리")
                .category(TrainingCategory.GMP)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .username("hong")
                .traineeName("홍길동")
                .department("품질보증팀")
                .position("선임연구원")
                .trainingDate(LocalDate.of(2026, 10, 15))
                .expiryDate(LocalDate.of(2027, 10, 15))
                .completionStatus(TrainingCompletionStatus.COMPLETED)
                .score(85)
                .isPassed(true)
                .evaluationMethod(EvaluationMethod.WRITTEN_TEST)
                .effectivenessEvaluation(EffectivenessEvaluation.EFFECTIVE)
                .isDeleted(false)
                .build();

        sampleQualification = UserQualification.builder()
                .id(20L)
                .userId(1L)
                .username("hong")
                .employeeName("홍길동")
                .department("품질보증팀")
                .position("선임연구원")
                .qualificationName("ISO 13485 내부심사원 자격")
                .qualificationType(QualificationType.AUDITOR)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .certifiedDate(LocalDate.of(2026, 1, 15))
                .expiryDate(LocalDate.of(2027, 1, 15))
                .certificateNumber("CERT-AUDIT-2026-001")
                .isDeleted(false)
                .build();
    }

    // =========================================================================
    // 1. 교육과정 마스터 (Training Course)
    // =========================================================================

    @Test
    @DisplayName("신규 교육과정 등록 성공")
    void createCourse_success() {
        TrainingCourseRequest request = TrainingCourseRequest.builder()
                .courseCode("TC-GMP-001")
                .courseName("의료기기 GMP 기본 및 오염관리")
                .category(TrainingCategory.GMP)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .cycleMonths(12)
                .passingScore(80)
                .trainingHours(4.0)
                .isRequired(true)
                .status("ACTIVE")
                .build();

        when(courseRepository.existsByCourseCodeAndIsDeletedFalse("TC-GMP-001")).thenReturn(false);
        when(courseRepository.save(any(TrainingCourse.class))).thenReturn(sampleCourse);

        TrainingCourse created = service.createCourse(request, "tester");

        assertThat(created).isNotNull();
        assertThat(created.getCourseCode()).isEqualTo("TC-GMP-001");
        verify(courseRepository).save(any(TrainingCourse.class));
        verify(eventPublisher).publishEvent((Object) any());
    }

    @Test
    @DisplayName("교육과정 중복 코드 등록 시 예외 발생")
    void createCourse_duplicateCode_throwsException() {
        TrainingCourseRequest request = TrainingCourseRequest.builder()
                .courseCode("TC-GMP-001")
                .courseName("중복 교육과정")
                .category(TrainingCategory.GMP)
                .build();

        when(courseRepository.existsByCourseCodeAndIsDeletedFalse("TC-GMP-001")).thenReturn(true);

        assertThatThrownBy(() -> service.createCourse(request, "tester"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미 사용 중인 교육과정 코드입니다");
    }

    @Test
    @DisplayName("교육과정 삭제 시 소프트 삭제(isDeleted=true) 적용")
    void deleteCourse_softDeletes() {
        when(courseRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCourse));

        service.deleteCourse(1L, "tester");

        assertThat(sampleCourse.getIsDeleted()).isTrue();
        assertThat(sampleCourse.getDeletedAt()).isNotNull();
        verify(courseRepository).save(sampleCourse);
    }

    // =========================================================================
    // 2. 교육이수 및 평가 기록 (Training Record)
    // =========================================================================

    @Test
    @DisplayName("교육이수 기록 생성 시 만료일 자동 계산 및 합격 판정")
    void createRecord_autoCalculatesExpiryAndPassStatus() {
        TrainingRecordRequest request = TrainingRecordRequest.builder()
                .courseId(1L)
                .username("hong")
                .traineeName("홍길동")
                .trainingDate(LocalDate.of(2026, 10, 10))
                .score(85) // Passing score is 80
                .evaluationMethod(EvaluationMethod.WRITTEN_TEST)
                .build();

        when(courseRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCourse));
        when(recordRepository.countByIsDeletedFalse()).thenReturn(0L);
        when(recordRepository.save(any(TrainingRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TrainingRecord record = service.createRecord(request, "tester");

        assertThat(record.getRecordNo()).startsWith("TRR-");
        // Expiry date should be trainingDate + 12 months = 2027-10-10
        assertThat(record.getExpiryDate()).isEqualTo(LocalDate.of(2027, 10, 10));
        assertThat(record.isPassed()).isTrue();
        assertThat(record.getCompletionStatus()).isEqualTo(TrainingCompletionStatus.COMPLETED);
    }

    @Test
    @DisplayName("교육 점수 미달 시 불합격(FAILED) 판정")
    void createRecord_scoreBelowPassing_setsFailed() {
        TrainingRecordRequest request = TrainingRecordRequest.builder()
                .courseId(1L)
                .username("kim")
                .traineeName("김철수")
                .trainingDate(LocalDate.of(2026, 10, 10))
                .score(65) // Passing score is 80
                .evaluationMethod(EvaluationMethod.WRITTEN_TEST)
                .build();

        when(courseRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCourse));
        when(recordRepository.countByIsDeletedFalse()).thenReturn(1L);
        when(recordRepository.save(any(TrainingRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TrainingRecord record = service.createRecord(request, "tester");

        assertThat(record.isPassed()).isFalse();
        assertThat(record.getCompletionStatus()).isEqualTo(TrainingCompletionStatus.FAILED);
    }

    // =========================================================================
    // 3. 직무 자격 관리 (User Qualification)
    // =========================================================================

    @Test
    @DisplayName("직무 자격 등록 성공")
    void createQualification_success() {
        UserQualificationRequest request = UserQualificationRequest.builder()
                .userId(1L)
                .username("hong")
                .employeeName("홍길동")
                .qualificationName("ISO 13485 내부심사원 자격")
                .qualificationType(QualificationType.AUDITOR)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .certifiedDate(LocalDate.of(2026, 1, 15))
                .expiryDate(LocalDate.of(2027, 1, 15))
                .build();

        when(qualificationRepository.save(any(UserQualification.class))).thenReturn(sampleQualification);

        UserQualification created = service.createQualification(request, "tester");

        assertThat(created).isNotNull();
        assertThat(created.getQualificationName()).isEqualTo("ISO 13485 내부심사원 자격");
        verify(qualificationRepository).save(any(UserQualification.class));
    }

    // =========================================================================
    // 4. 대시보드 KPI 메트릭 집계
    // =========================================================================

    @Test
    @DisplayName("교육훈련 KPI 메트릭 계산 성공")
    void getMetrics_calculatesCorrectly() {
        when(courseRepository.countByIsDeletedFalse()).thenReturn(5L);
        when(courseRepository.countByIsDeletedFalseAndStatus("ACTIVE")).thenReturn(5L);
        when(courseRepository.countByIsDeletedFalseAndIsRequiredTrue()).thenReturn(4L);

        when(recordRepository.countByIsDeletedFalse()).thenReturn(10L);
        when(recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.COMPLETED)).thenReturn(8L);
        when(recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.SCHEDULED)).thenReturn(2L);
        when(recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.IN_PROGRESS)).thenReturn(0L);

        when(recordRepository.countExpiringSoon(any(LocalDate.class), any(LocalDate.class))).thenReturn(1L);
        when(recordRepository.countExpired(any(LocalDate.class))).thenReturn(0L);

        when(qualificationRepository.countByIsDeletedFalse()).thenReturn(6L);
        when(qualificationRepository.countByIsDeletedFalseAndQualificationStatus(QualificationStatus.QUALIFIED)).thenReturn(5L);
        when(qualificationRepository.countExpiringSoon(any(LocalDate.class), any(LocalDate.class))).thenReturn(2L);

        TrainingMetricsResponse metrics = service.getMetrics();

        assertThat(metrics.getTotalCourses()).isEqualTo(5L);
        assertThat(metrics.getActiveCourses()).isEqualTo(5L);
        assertThat(metrics.getTotalRecords()).isEqualTo(10L);
        assertThat(metrics.getCompletedRecords()).isEqualTo(8L);
        assertThat(metrics.getCompletionRate()).isEqualTo(80.0);
        assertThat(metrics.getExpiringSoonRecords()).isEqualTo(1L);
        assertThat(metrics.getQualifiedUsers()).isEqualTo(5L);
    }
}
