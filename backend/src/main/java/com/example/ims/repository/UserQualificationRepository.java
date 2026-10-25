package com.example.ims.repository;

import com.example.ims.entity.QualificationStatus;
import com.example.ims.entity.QualificationType;
import com.example.ims.entity.UserQualification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserQualificationRepository extends JpaRepository<UserQualification, Long> {

    Optional<UserQualification> findByIdAndIsDeletedFalse(Long id);

    List<UserQualification> findByIsDeletedFalseOrderByCertifiedDateDesc();

    List<UserQualification> findByUsernameAndIsDeletedFalseOrderByCertifiedDateDesc(String username);

    @Query("SELECT uq FROM UserQualification uq WHERE uq.isDeleted = false " +
           "AND (:type IS NULL OR uq.qualificationType = :type) " +
           "AND (:status IS NULL OR uq.qualificationStatus = :status) " +
           "AND (:department IS NULL OR uq.department = :department) " +
           "AND (:keyword IS NULL OR LOWER(uq.qualificationName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(uq.employeeName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(uq.username) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(uq.certificateNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY uq.certifiedDate DESC")
    List<UserQualification> searchQualifications(
            @Param("type") QualificationType type,
            @Param("status") QualificationStatus status,
            @Param("department") String department,
            @Param("keyword") String keyword
    );

    long countByIsDeletedFalse();

    long countByIsDeletedFalseAndQualificationStatus(QualificationStatus status);

    @Query("SELECT COUNT(uq) FROM UserQualification uq WHERE uq.isDeleted = false " +
           "AND uq.qualificationStatus = 'QUALIFIED' " +
           "AND uq.expiryDate IS NOT NULL " +
           "AND uq.expiryDate >= :today AND uq.expiryDate <= :targetDate")
    long countExpiringSoon(@Param("today") LocalDate today, @Param("targetDate") LocalDate targetDate);
}
