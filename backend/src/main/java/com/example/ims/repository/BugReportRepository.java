package com.example.ims.repository;

import com.example.ims.entity.BugReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

public interface BugReportRepository extends JpaRepository<BugReport, Long> {
    @Query("SELECT b FROM BugReport b ORDER BY COALESCE(b.updatedAt, b.createdAt) DESC, b.id DESC")
    List<BugReport> findAllCustomOrdered();

    List<BugReport> findAllByOrderByCreatedAtDesc();

    Optional<BugReport> findFirstByScreenNameAndDescriptionAndCreatedAtAfterOrderByCreatedAtDesc(
        String screenName, String description, LocalDateTime since
    );
}
