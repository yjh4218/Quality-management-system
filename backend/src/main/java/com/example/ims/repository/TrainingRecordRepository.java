package com.example.ims.repository;

import com.example.ims.entity.EffectivenessEvaluation;
import com.example.ims.entity.TrainingCategory;
import com.example.ims.entity.TrainingCompletionStatus;
import com.example.ims.entity.TrainingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingRecordRepository extends JpaRepository<TrainingRecord, Long> {

    Optional<TrainingRecord> findByIdAndIsDeletedFalse(Long id);

    Optional<TrainingRecord> findByRecordNoAndIsDeletedFalse(String recordNo);

    boolean existsByRecordNoAndIsDeletedFalse(String recordNo);

    List<TrainingRecord> findByIsDeletedFalseOrderByTrainingDateDesc();

    List<TrainingRecord> findByCourseIdAndIsDeletedFalseOrderByTrainingDateDesc(Long courseId);

    List<TrainingRecord> findByUsernameAndIsDeletedFalseOrderByTrainingDateDesc(String username);

    @Query("SELECT tr FROM TrainingRecord tr WHERE tr.isDeleted = false " +
           "AND (:courseId IS NULL OR tr.courseId = :courseId) " +
           "AND (:category IS NULL OR tr.category = :category) " +
           "AND (:completionStatus IS NULL OR tr.completionStatus = :completionStatus) " +
           "AND (:effectiveness IS NULL OR tr.effectivenessEvaluation = :effectiveness) " +
           "AND (:department IS NULL OR tr.department = :department) " +
           "AND (:keyword IS NULL OR LOWER(tr.recordNo) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(tr.courseName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(tr.traineeName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(tr.username) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY tr.trainingDate DESC")
    List<TrainingRecord> searchRecords(
            @Param("courseId") Long courseId,
            @Param("category") TrainingCategory category,
            @Param("completionStatus") TrainingCompletionStatus completionStatus,
            @Param("effectiveness") EffectivenessEvaluation effectiveness,
            @Param("department") String department,
            @Param("keyword") String keyword
    );

    long countByIsDeletedFalse();

    long countByIsDeletedFalseAndCompletionStatus(TrainingCompletionStatus status);

    /** 만료 임박(30일 이내) 레코드 조회 */
    @Query("SELECT COUNT(tr) FROM TrainingRecord tr WHERE tr.isDeleted = false " +
           "AND tr.completionStatus = 'COMPLETED' " +
           "AND tr.expiryDate IS NOT NULL " +
           "AND tr.expiryDate >= :today AND tr.expiryDate <= :targetDate")
    long countExpiringSoon(@Param("today") LocalDate today, @Param("targetDate") LocalDate targetDate);

    /** 이미 기한 만료된 레코드 조회 */
    @Query("SELECT COUNT(tr) FROM TrainingRecord tr WHERE tr.isDeleted = false " +
           "AND tr.expiryDate IS NOT NULL AND tr.expiryDate < :today")
    long countExpired(@Param("today") LocalDate today);

    /** 특정 사용자 및 과정의 최신 이수 기록 */
    Optional<TrainingRecord> findFirstByUsernameAndCourseCodeAndIsDeletedFalseOrderByTrainingDateDesc(String username, String courseCode);
}
