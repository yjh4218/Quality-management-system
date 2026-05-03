package com.example.ims.repository;

import com.example.ims.entity.ClaimHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimHistoryRepository extends JpaRepository<ClaimHistory, Long> {
    List<ClaimHistory> findByClaimIdOrderByModifiedAtDesc(Long claimId);
}
