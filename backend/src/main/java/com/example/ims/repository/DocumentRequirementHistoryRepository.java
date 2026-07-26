package com.example.ims.repository;

import com.example.ims.entity.DocumentRequirementHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRequirementHistoryRepository extends JpaRepository<DocumentRequirementHistory, Long> {
    List<DocumentRequirementHistory> findByRequirementIdOrderByUploadedAtDesc(Long requirementId);
}
