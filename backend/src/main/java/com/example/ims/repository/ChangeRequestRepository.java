package com.example.ims.repository;

import com.example.ims.entity.ChangeCategory;
import com.example.ims.entity.ChangeRequest;
import com.example.ims.entity.ChangeStatus;
import com.example.ims.entity.ChangeUrgency;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 🔄 변경요청서(ChangeRequest) 데이터 접근 레포지토리
 */
@Repository
public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {

    Optional<ChangeRequest> findByIdAndIsDeletedFalse(Long id);

    Optional<ChangeRequest> findByChangeNumberAndIsDeletedFalse(String changeNumber);

    boolean existsByChangeNumberAndIsDeletedFalse(String changeNumber);

    @Query("SELECT cr FROM ChangeRequest cr WHERE cr.isDeleted = false " +
           "AND (:keyword IS NULL OR LOWER(cr.changeNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(cr.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(cr.initiatorName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(cr.department) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(cr.targetItemName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:category IS NULL OR cr.category = :category) " +
           "AND (:urgency IS NULL OR cr.urgency = :urgency) " +
           "AND (:status IS NULL OR cr.status = :status) " +
           "ORDER BY cr.id DESC")
    Page<ChangeRequest> searchChangeRequests(
            @Param("keyword") String keyword,
            @Param("category") ChangeCategory category,
            @Param("urgency") ChangeUrgency urgency,
            @Param("status") ChangeStatus status,
            Pageable pageable);

    long countByIsDeletedFalse();

    long countByStatusAndIsDeletedFalse(ChangeStatus status);

    long countByStatusInAndIsDeletedFalse(List<ChangeStatus> statuses);

    @Query("SELECT cr.category, COUNT(cr) FROM ChangeRequest cr WHERE cr.isDeleted = false GROUP BY cr.category")
    List<Object[]> countByCategory();

    @Query("SELECT cr.status, COUNT(cr) FROM ChangeRequest cr WHERE cr.isDeleted = false GROUP BY cr.status")
    List<Object[]> countByStatus();

    @Query("SELECT cr.urgency, COUNT(cr) FROM ChangeRequest cr WHERE cr.isDeleted = false GROUP BY cr.urgency")
    List<Object[]> countByUrgency();

    @Query("SELECT COUNT(cr) FROM ChangeRequest cr WHERE cr.isDeleted = false AND cr.status = 'CLOSED' AND cr.effectivenessStatus = 'EFFECTIVE'")
    long countEffectiveClosedChanges();

    @Query("SELECT COUNT(cr) FROM ChangeRequest cr WHERE cr.isDeleted = false AND cr.status = 'CLOSED'")
    long countTotalClosedChanges();
}
