package com.example.ims.repository;

import com.example.ims.entity.CsvGoLiveApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CsvGoLiveApprovalRepository extends JpaRepository<CsvGoLiveApproval, Long> {
    Optional<CsvGoLiveApproval> findByProjectIdAndIsDeletedFalse(Long projectId);
    List<CsvGoLiveApproval> findByIsDeletedFalseOrderByCreatedAtDesc();
    long countByIsDeletedFalse();
}
