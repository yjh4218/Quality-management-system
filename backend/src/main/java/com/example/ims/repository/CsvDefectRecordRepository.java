package com.example.ims.repository;

import com.example.ims.entity.CsvDefectRecord;
import com.example.ims.entity.DefectSeverity;
import com.example.ims.entity.DefectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CsvDefectRecordRepository extends JpaRepository<CsvDefectRecord, Long> {
    Optional<CsvDefectRecord> findByDefectNumberAndIsDeletedFalse(String defectNumber);
    List<CsvDefectRecord> findByProjectIdAndIsDeletedFalseOrderByReportedAtDesc(Long projectId);
    List<CsvDefectRecord> findByIsDeletedFalseOrderByReportedAtDesc();
    long countByProjectIdAndStatusAndIsDeletedFalse(Long projectId, DefectStatus status);
    long countByProjectIdAndSeverityAndStatusAndIsDeletedFalse(Long projectId, DefectSeverity severity, DefectStatus status);
    long countByStatusAndIsDeletedFalse(DefectStatus status);
    long countByIsDeletedFalse();
}
