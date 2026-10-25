package com.example.ims.repository;

import com.example.ims.entity.DesignReviewRecord;
import com.example.ims.entity.GateDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DesignReviewRecordRepository extends JpaRepository<DesignReviewRecord, Long> {

    List<DesignReviewRecord> findByProjectIdOrderByReviewDateDesc(Long projectId);

    Optional<DesignReviewRecord> findByProjectIdAndReviewNumber(Long projectId, String reviewNumber);

    boolean existsByProjectIdAndReviewNumber(Long projectId, String reviewNumber);

    long countByProjectId(Long projectId);

    long countByProjectIdAndGateDecision(Long projectId, GateDecision decision);

    long countByGateDecision(GateDecision decision);
}
