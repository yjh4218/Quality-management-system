package com.example.ims.repository;

import com.example.ims.entity.BugReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BugReportRepository extends JpaRepository<BugReport, Long> {
    List<BugReport> findAllByOrderByCreatedAtDesc();
    
    Optional<BugReport> findFirstByScreenNameAndDescriptionAndCreatedAtAfterOrderByCreatedAtDesc(
        String screenName, String description, LocalDateTime since
    );
}
