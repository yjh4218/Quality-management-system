package com.example.ims.repository;

import com.example.ims.entity.ApprovalTemplateStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalTemplateStepRepository extends JpaRepository<ApprovalTemplateStep, Long> {
    List<ApprovalTemplateStep> findByTemplateIdOrderByStepOrderAsc(Long templateId);
    void deleteByTemplateId(Long templateId);
}
