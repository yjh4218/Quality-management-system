package com.example.ims.repository;

import com.example.ims.entity.Part11AssessmentItem;
import com.example.ims.entity.Part11ComplianceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface Part11AssessmentItemRepository extends JpaRepository<Part11AssessmentItem, Long> {

    List<Part11AssessmentItem> findAllByOrderByDisplayOrderAsc();

    Optional<Part11AssessmentItem> findBySectionCode(String sectionCode);

    long countByComplianceStatus(Part11ComplianceStatus status);
}
