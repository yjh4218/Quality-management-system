package com.example.ims.repository;

import com.example.ims.entity.AgreementStatus;
import com.example.ims.entity.AgreementType;
import com.example.ims.entity.QualityAgreement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface QualityAgreementRepository extends JpaRepository<QualityAgreement, Long> {

    Optional<QualityAgreement> findByAgreementNumber(String agreementNumber);

    boolean existsByAgreementNumber(String agreementNumber);

    Optional<QualityAgreement> findTopByOrderByAgreementNumberDesc();

    List<QualityAgreement> findByManufacturerId(Long manufacturerId);

    @Query("SELECT qa FROM QualityAgreement qa " +
           "JOIN FETCH qa.manufacturer m " +
           "LEFT JOIN FETCH qa.qualification sq " +
           "WHERE (:status IS NULL OR qa.agreementStatus = :status) " +
           "  AND (:type IS NULL OR qa.agreementType = :type) " +
           "  AND (:keyword IS NULL OR LOWER(qa.agreementNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(qa.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY qa.expiryDate ASC, qa.id DESC")
    Page<QualityAgreement> searchAgreements(
            @Param("status") AgreementStatus status,
            @Param("type") AgreementType type,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT qa.agreementStatus, COUNT(qa) FROM QualityAgreement qa GROUP BY qa.agreementStatus")
    List<Object[]> countByAgreementStatus();

    long countByAgreementStatus(AgreementStatus status);

    @Query("SELECT COUNT(qa) FROM QualityAgreement qa WHERE qa.agreementStatus != 'TERMINATED' AND qa.expiryDate <= :targetDate")
    long countExpiringSoon(@Param("targetDate") LocalDate targetDate);

    @Query("SELECT COUNT(DISTINCT qa.manufacturer.id) FROM QualityAgreement qa WHERE qa.agreementStatus = 'ACTIVE'")
    long countDistinctActiveManufacturers();
}
