package com.example.ims.repository;

import com.example.ims.entity.ComplaintActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintActionItemRepository extends JpaRepository<ComplaintActionItem, Long> {

    List<ComplaintActionItem> findByEvaluationIdOrderByDueDateAsc(Long evaluationId);

    Optional<ComplaintActionItem> findByActionItemNumber(String actionItemNumber);

    long countByEvaluationId(Long evaluationId);
}
