package com.example.ims.repository;

import com.example.ims.entity.DocumentRequirementHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRequirementHistoryRepository extends JpaRepository<DocumentRequirementHistory, Long> {
    List<DocumentRequirementHistory> findByRequirementIdOrderByUploadedAtDesc(Long requirementId);
}
