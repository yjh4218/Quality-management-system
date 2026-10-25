package com.example.ims.repository;

import com.example.ims.entity.ManagementReview;
import com.example.ims.entity.ManagementReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ManagementReviewRepository extends JpaRepository<ManagementReview, Long> {

    Optional<ManagementReview> findByReviewNumberAndIsDeletedFalse(String reviewNumber);

    List<ManagementReview> findByIsDeletedFalseOrderByReviewDateDesc();

    List<ManagementReview> findByStatusAndIsDeletedFalse(ManagementReviewStatus status);

    @Query("SELECT COUNT(m) FROM ManagementReview m WHERE m.isDeleted = false")
    long countTotalReviews();

    @Query("SELECT COUNT(m) FROM ManagementReview m WHERE m.isDeleted = false AND m.status = 'APPROVED' AND m.reviewDate BETWEEN :start AND :end")
    long countApprovedReviewsBetween(LocalDate start, LocalDate end);

    @Query("SELECT m FROM ManagementReview m WHERE m.isDeleted = false AND m.nextReviewDueDate IS NOT NULL ORDER BY m.nextReviewDueDate ASC")
    List<ManagementReview> findUpcomingReviews();
}
