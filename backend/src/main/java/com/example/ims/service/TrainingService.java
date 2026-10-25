package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.TrainingCourseRepository;
import com.example.ims.repository.TrainingRecordRepository;
import com.example.ims.repository.UserQualificationRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * 🎓 교육훈련 및 자격관리 (Training & Competence) 비즈니스 로직 서비스.
 * ISO 13485:2016 §6.2, ISO 22716 §3 및 화장품법 제3조·제7조 준수.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrainingService {

    private final TrainingCourseRepository courseRepository;
    private final TrainingRecordRepository recordRepository;
    private final UserQualificationRepository qualificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    // =========================================================================
    // 1. 표준 교육과정 마스터 (Training Course)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<TrainingCourse> getCourses(TrainingCategory category, ProductFamily targetFamily, String status, String keyword) {
        if (category == null && targetFamily == null && (status == null || status.isBlank()) && (keyword == null || keyword.isBlank())) {
            return courseRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        }
        return courseRepository.searchCourses(category, targetFamily, (status != null && !status.isBlank()) ? status : null, (keyword != null && !keyword.isBlank()) ? keyword : null);
    }

    @Transactional(readOnly = true)
    public TrainingCourse getCourseById(Long id) {
        return courseRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 교육과정입니다. ID: " + id));
    }

    @Transactional
    public TrainingCourse createCourse(TrainingCourseRequest request, String username) {
        if (courseRepository.existsByCourseCodeAndIsDeletedFalse(request.getCourseCode())) {
            throw new IllegalArgumentException("이미 사용 중인 교육과정 코드입니다: " + request.getCourseCode());
        }

        TrainingCourse course = TrainingCourse.builder()
                .courseCode(request.getCourseCode().trim())
                .courseName(request.getCourseName().trim())
                .category(request.getCategory())
                .targetFamily(request.getTargetFamily() != null ? request.getTargetFamily() : ProductFamily.COMMON)
                .targetAudience(request.getTargetAudience())
                .cycleMonths(request.getCycleMonths() != null ? request.getCycleMonths() : 12)
                .passingScore(request.getPassingScore() != null ? request.getPassingScore() : 70)
                .trainingHours(request.getTrainingHours() != null ? request.getTrainingHours() : 2.0)
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : true)
                .instructor(request.getInstructor())
                .description(request.getDescription())
                .materialUrl(request.getMaterialUrl())
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus() : "ACTIVE")
                .createdBy(username)
                .updatedBy(username)
                .build();

        TrainingCourse saved = courseRepository.save(course);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_COURSE")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(username)
                .modifierUsername(username)
                .description("신규 교육과정 등록: " + saved.getCourseCode() + " (" + saved.getCourseName() + ")")
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Created course: {} by {}", saved.getCourseCode(), username);
        return saved;
    }

    @Transactional
    public TrainingCourse updateCourse(Long id, TrainingCourseRequest request, String username) {
        TrainingCourse course = getCourseById(id);

        if (!course.getCourseCode().equals(request.getCourseCode().trim())) {
            if (courseRepository.existsByCourseCodeAndIsDeletedFalse(request.getCourseCode().trim())) {
                throw new IllegalArgumentException("이미 사용 중인 교육과정 코드입니다: " + request.getCourseCode());
            }
            course.setCourseCode(request.getCourseCode().trim());
        }

        course.setCourseName(request.getCourseName().trim());
        course.setCategory(request.getCategory());
        course.setTargetFamily(request.getTargetFamily() != null ? request.getTargetFamily() : ProductFamily.COMMON);
        course.setTargetAudience(request.getTargetAudience());
        course.setCycleMonths(request.getCycleMonths() != null ? request.getCycleMonths() : 12);
        course.setPassingScore(request.getPassingScore() != null ? request.getPassingScore() : 70);
        course.setTrainingHours(request.getTrainingHours() != null ? request.getTrainingHours() : 2.0);
        course.setIsRequired(request.getIsRequired() != null ? request.getIsRequired() : true);
        course.setInstructor(request.getInstructor());
        course.setDescription(request.getDescription());
        course.setMaterialUrl(request.getMaterialUrl());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            course.setStatus(request.getStatus());
        }
        course.setUpdatedBy(username);

        TrainingCourse saved = courseRepository.save(course);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_COURSE")
                .entityId(saved.getId())
                .action("UPDATE")
                .modifier(username)
                .modifierUsername(username)
                .description("교육과정 수정: " + saved.getCourseCode())
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Updated course: {} by {}", saved.getCourseCode(), username);
        return saved;
    }

    @Transactional
    public void deleteCourse(Long id, String username) {
        TrainingCourse course = getCourseById(id);
        course.setIsDeleted(true);
        course.setDeletedAt(LocalDateTime.now());
        course.setUpdatedBy(username);
        courseRepository.save(course);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_COURSE")
                .entityId(course.getId())
                .action("DELETE")
                .modifier(username)
                .modifierUsername(username)
                .description("교육과정 삭제: " + course.getCourseCode())
                .build());

        log.info(">>>> [TRAINING] Deleted course: {} by {}", course.getCourseCode(), username);
    }

    // =========================================================================
    // 2. 교육이수 및 평가 기록 (Training Record)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<TrainingRecord> getRecords(Long courseId, TrainingCategory category, TrainingCompletionStatus completionStatus, EffectivenessEvaluation effectiveness, String department, String keyword) {
        if (courseId == null && category == null && completionStatus == null && effectiveness == null && (department == null || department.isBlank()) && (keyword == null || keyword.isBlank())) {
            return recordRepository.findByIsDeletedFalseOrderByTrainingDateDesc();
        }
        return recordRepository.searchRecords(courseId, category, completionStatus, effectiveness, (department != null && !department.isBlank()) ? department : null, (keyword != null && !keyword.isBlank()) ? keyword : null);
    }

    @Transactional(readOnly = true)
    public TrainingRecord getRecordById(Long id) {
        return recordRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 교육이수 기록입니다. ID: " + id));
    }

    @Transactional
    public TrainingRecord createRecord(TrainingRecordRequest request, String username) {
        TrainingCourse course = getCourseById(request.getCourseId());

        // 번호 자동 생성 (예: TRR-202610-001)
        String recordNo = request.getRecordNo();
        if (recordNo == null || recordNo.trim().isEmpty()) {
            recordNo = generateRecordNo();
        }

        // 유효 만료일 자동 계산: trainingDate + course.cycleMonths
        LocalDate trainingDate = request.getTrainingDate() != null ? request.getTrainingDate() : LocalDate.now();
        LocalDate expiryDate = request.getExpiryDate();
        if (expiryDate == null) {
            int months = (course.getCycleMonths() != null && course.getCycleMonths() > 0) ? course.getCycleMonths() : 12;
            expiryDate = trainingDate.plusMonths(months);
        }

        // 합격 및 이수상태 자동 판정
        Integer score = request.getScore();
        boolean isPassed = false;
        TrainingCompletionStatus status = request.getCompletionStatus();
        if (score != null) {
            isPassed = score >= (course.getPassingScore() != null ? course.getPassingScore() : 70);
            if (status == null) {
                status = isPassed ? TrainingCompletionStatus.COMPLETED : TrainingCompletionStatus.FAILED;
            }
        } else if (status == null) {
            status = TrainingCompletionStatus.SCHEDULED;
        }

        // 대상자 부서/직책 보완
        String department = request.getDepartment();
        String position = request.getPosition();
        if (department == null || department.isBlank() || position == null || position.isBlank()) {
            Optional<User> uOpt = userRepository.findByUsername(request.getUsername());
            if (uOpt.isPresent()) {
                if (department == null || department.isBlank()) department = uOpt.get().getDepartment();
                if (position == null || position.isBlank()) position = uOpt.get().getPosition();
            }
        }

        TrainingRecord record = TrainingRecord.builder()
                .recordNo(recordNo)
                .courseId(course.getId())
                .courseCode(course.getCourseCode())
                .courseName(course.getCourseName())
                .category(course.getCategory())
                .targetFamily(course.getTargetFamily())
                .userId(request.getUserId())
                .username(request.getUsername().trim())
                .traineeName(request.getTraineeName().trim())
                .department(department)
                .position(position)
                .trainingDate(trainingDate)
                .expiryDate(expiryDate)
                .completionStatus(status)
                .score(score)
                .isPassed(isPassed)
                .evaluationMethod(request.getEvaluationMethod() != null ? request.getEvaluationMethod() : EvaluationMethod.WRITTEN_TEST)
                .effectivenessEvaluation(request.getEffectivenessEvaluation() != null ? request.getEffectivenessEvaluation() : EffectivenessEvaluation.PENDING)
                .effectivenessEvaluator(request.getEffectivenessEvaluator())
                .effectivenessDate(request.getEffectivenessDate())
                .effectivenessNotes(request.getEffectivenessNotes())
                .certificateUrl(request.getCertificateUrl())
                .certificateFileName(request.getCertificateFileName())
                .certificateFileSize(request.getCertificateFileSize())
                .remarks(request.getRemarks())
                .createdBy(username)
                .updatedBy(username)
                .build();

        TrainingRecord saved = recordRepository.save(record);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_RECORD")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(username)
                .modifierUsername(username)
                .description("교육이수 기록 등록: " + saved.getRecordNo() + " (" + saved.getTraineeName() + " - " + saved.getCourseName() + ")")
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Created record: {} for user: {} by {}", saved.getRecordNo(), saved.getUsername(), username);
        return saved;
    }

    @Transactional
    public TrainingRecord updateRecord(Long id, TrainingRecordRequest request, String username) {
        TrainingRecord record = getRecordById(id);
        TrainingCourse course = getCourseById(record.getCourseId());

        if (request.getTrainingDate() != null) {
            record.setTrainingDate(request.getTrainingDate());
            if (request.getExpiryDate() != null) {
                record.setExpiryDate(request.getExpiryDate());
            } else {
                int months = (course.getCycleMonths() != null && course.getCycleMonths() > 0) ? course.getCycleMonths() : 12;
                record.setExpiryDate(request.getTrainingDate().plusMonths(months));
            }
        } else if (request.getExpiryDate() != null) {
            record.setExpiryDate(request.getExpiryDate());
        }

        if (request.getScore() != null) {
            record.setScore(request.getScore());
            boolean isPassed = request.getScore() >= (course.getPassingScore() != null ? course.getPassingScore() : 70);
            record.setIsPassed(isPassed);
            if (request.getCompletionStatus() != null) {
                record.setCompletionStatus(request.getCompletionStatus());
            } else {
                record.setCompletionStatus(isPassed ? TrainingCompletionStatus.COMPLETED : TrainingCompletionStatus.FAILED);
            }
        } else if (request.getCompletionStatus() != null) {
            record.setCompletionStatus(request.getCompletionStatus());
        }

        if (request.getEvaluationMethod() != null) record.setEvaluationMethod(request.getEvaluationMethod());
        if (request.getEffectivenessEvaluation() != null) record.setEffectivenessEvaluation(request.getEffectivenessEvaluation());
        if (request.getEffectivenessEvaluator() != null) record.setEffectivenessEvaluator(request.getEffectivenessEvaluator());
        if (request.getEffectivenessDate() != null) record.setEffectivenessDate(request.getEffectivenessDate());
        if (request.getEffectivenessNotes() != null) record.setEffectivenessNotes(request.getEffectivenessNotes());
        if (request.getCertificateUrl() != null) record.setCertificateUrl(request.getCertificateUrl());
        if (request.getCertificateFileName() != null) record.setCertificateFileName(request.getCertificateFileName());
        if (request.getCertificateFileSize() != null) record.setCertificateFileSize(request.getCertificateFileSize());
        if (request.getRemarks() != null) record.setRemarks(request.getRemarks());
        record.setUpdatedBy(username);

        TrainingRecord saved = recordRepository.save(record);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_RECORD")
                .entityId(saved.getId())
                .action("UPDATE")
                .modifier(username)
                .modifierUsername(username)
                .description("교육이수 기록 갱신: " + saved.getRecordNo())
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Updated record: {} by {}", saved.getRecordNo(), username);
        return saved;
    }

    @Transactional
    public void deleteRecord(Long id, String username) {
        TrainingRecord record = getRecordById(id);
        record.setIsDeleted(true);
        record.setDeletedAt(LocalDateTime.now());
        record.setUpdatedBy(username);
        recordRepository.save(record);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("TRAINING_RECORD")
                .entityId(record.getId())
                .action("DELETE")
                .modifier(username)
                .modifierUsername(username)
                .description("교육이수 기록 삭제: " + record.getRecordNo())
                .build());

        log.info(">>>> [TRAINING] Deleted record: {} by {}", record.getRecordNo(), username);
    }

    // =========================================================================
    // 3. 직무 자격 관리 (User Qualification - Competence Matrix)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<UserQualification> getQualifications(QualificationType type, QualificationStatus status, String department, String keyword) {
        if (type == null && status == null && (department == null || department.isBlank()) && (keyword == null || keyword.isBlank())) {
            return qualificationRepository.findByIsDeletedFalseOrderByCertifiedDateDesc();
        }
        return qualificationRepository.searchQualifications(type, status, (department != null && !department.isBlank()) ? department : null, (keyword != null && !keyword.isBlank()) ? keyword : null);
    }

    @Transactional(readOnly = true)
    public UserQualification getQualificationById(Long id) {
        return qualificationRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 직무 자격 항목입니다. ID: " + id));
    }

    @Transactional
    public UserQualification createQualification(UserQualificationRequest request, String username) {
        String department = request.getDepartment();
        String position = request.getPosition();
        if (department == null || department.isBlank() || position == null || position.isBlank()) {
            Optional<User> uOpt = userRepository.findByUsername(request.getUsername());
            if (uOpt.isPresent()) {
                if (department == null || department.isBlank()) department = uOpt.get().getDepartment();
                if (position == null || position.isBlank()) position = uOpt.get().getPosition();
            }
        }

        LocalDate certifiedDate = request.getCertifiedDate() != null ? request.getCertifiedDate() : LocalDate.now();
        LocalDate expiryDate = request.getExpiryDate() != null ? request.getExpiryDate() : certifiedDate.plusYears(1);

        UserQualification qualification = UserQualification.builder()
                .userId(request.getUserId())
                .username(request.getUsername().trim())
                .employeeName(request.getEmployeeName().trim())
                .department(department)
                .position(position)
                .qualificationName(request.getQualificationName().trim())
                .qualificationType(request.getQualificationType())
                .qualificationStatus(request.getQualificationStatus() != null ? request.getQualificationStatus() : QualificationStatus.QUALIFIED)
                .certifiedDate(certifiedDate)
                .expiryDate(expiryDate)
                .requiredCourseCode(request.getRequiredCourseCode())
                .certificateNumber(request.getCertificateNumber())
                .authorizerName(request.getAuthorizerName())
                .remarks(request.getRemarks())
                .createdBy(username)
                .updatedBy(username)
                .build();

        UserQualification saved = qualificationRepository.save(qualification);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("USER_QUALIFICATION")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(username)
                .modifierUsername(username)
                .description("직무 자격 부여: " + saved.getEmployeeName() + " - " + saved.getQualificationName())
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Granted qualification: {} to {} by {}", saved.getQualificationName(), saved.getUsername(), username);
        return saved;
    }

    @Transactional
    public UserQualification updateQualification(Long id, UserQualificationRequest request, String username) {
        UserQualification q = getQualificationById(id);

        q.setQualificationName(request.getQualificationName().trim());
        q.setQualificationType(request.getQualificationType());
        if (request.getEmployeeName() != null && !request.getEmployeeName().isBlank()) {
            q.setEmployeeName(request.getEmployeeName().trim());
        }
        if (request.getQualificationStatus() != null) q.setQualificationStatus(request.getQualificationStatus());
        if (request.getCertifiedDate() != null) q.setCertifiedDate(request.getCertifiedDate());
        if (request.getExpiryDate() != null) q.setExpiryDate(request.getExpiryDate());
        if (request.getRequiredCourseCode() != null) q.setRequiredCourseCode(request.getRequiredCourseCode());
        if (request.getCertificateNumber() != null) q.setCertificateNumber(request.getCertificateNumber());
        if (request.getAuthorizerName() != null) q.setAuthorizerName(request.getAuthorizerName());
        if (request.getRemarks() != null) q.setRemarks(request.getRemarks());
        q.setUpdatedBy(username);

        UserQualification saved = qualificationRepository.save(q);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("USER_QUALIFICATION")
                .entityId(saved.getId())
                .action("UPDATE")
                .modifier(username)
                .modifierUsername(username)
                .description("직무 자격 갱신: " + saved.getEmployeeName() + " - " + saved.getQualificationName())
                .newEntity(saved)
                .build());

        log.info(">>>> [TRAINING] Updated qualification: {} by {}", saved.getId(), username);
        return saved;
    }

    @Transactional
    public void deleteQualification(Long id, String username) {
        UserQualification q = getQualificationById(id);
        q.setIsDeleted(true);
        q.setDeletedAt(LocalDateTime.now());
        q.setUpdatedBy(username);
        qualificationRepository.save(q);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("USER_QUALIFICATION")
                .entityId(q.getId())
                .action("DELETE")
                .modifier(username)
                .modifierUsername(username)
                .description("직무 자격 삭제: " + q.getQualificationName() + " (" + q.getEmployeeName() + ")")
                .build());

        log.info(">>>> [TRAINING] Deleted qualification: {} by {}", q.getId(), username);
    }

    // =========================================================================
    // 4. 대시보드 KPI 서머리 통계
    // =========================================================================

    @Transactional(readOnly = true)
    public TrainingMetricsResponse getMetrics() {
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);

        long totalCourses = courseRepository.countByIsDeletedFalse();
        long activeCourses = courseRepository.countByIsDeletedFalseAndStatus("ACTIVE");
        long requiredCourses = courseRepository.countByIsDeletedFalseAndIsRequiredTrue();

        long totalRecords = recordRepository.countByIsDeletedFalse();
        long completedRecords = recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.COMPLETED);
        long scheduledRecords = recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.SCHEDULED)
                + recordRepository.countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus.IN_PROGRESS);

        double completionRate = totalRecords > 0 ? Math.round((double) completedRecords / totalRecords * 1000.0) / 10.0 : 0.0;
        long expiringSoonRecords = recordRepository.countExpiringSoon(today, in30Days);
        long expiredRecords = recordRepository.countExpired(today);

        long totalQualifications = qualificationRepository.countByIsDeletedFalse();
        long qualifiedUsers = qualificationRepository.countByIsDeletedFalseAndQualificationStatus(QualificationStatus.QUALIFIED);
        long expiringSoonQualifications = qualificationRepository.countExpiringSoon(today, in30Days);

        return TrainingMetricsResponse.builder()
                .totalCourses(totalCourses)
                .activeCourses(activeCourses)
                .requiredCourses(requiredCourses)
                .totalRecords(totalRecords)
                .completedRecords(completedRecords)
                .completionRate(completionRate)
                .scheduledRecords(scheduledRecords)
                .expiringSoonRecords(expiringSoonRecords)
                .expiredRecords(expiredRecords)
                .totalQualifications(totalQualifications)
                .qualifiedUsers(qualifiedUsers)
                .expiringSoonQualifications(expiringSoonQualifications)
                .build();
    }

    private String generateRecordNo() {
        String ym = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = recordRepository.countByIsDeletedFalse() + 1;
        return String.format("TRR-%s-%03d", ym, count);
    }
}
