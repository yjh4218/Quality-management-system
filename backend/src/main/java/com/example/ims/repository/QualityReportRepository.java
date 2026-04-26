package com.example.ims.repository;

import com.example.ims.entity.QualityReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface QualityReportRepository extends JpaRepository<QualityReport, Long> {
    Optional<QualityReport> findByWmsInboundId(Long wmsInboundId);
}
