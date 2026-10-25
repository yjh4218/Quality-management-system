package com.example.ims.repository;

import com.example.ims.entity.CapaRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CapaRecordRepository extends JpaRepository<CapaRecord, Long>, JpaSpecificationExecutor<CapaRecord> {

    Optional<CapaRecord> findByCapaNumber(String capaNumber);

    Optional<CapaRecord> findTopByCapaNumberStartingWithOrderByCapaNumberDesc(String prefix);

    @Query(value = """
        SELECT
            COUNT(*) AS totalCapas,
            COUNT(CASE WHEN status IN ('ACTION_PLANNING', 'IMPLEMENTATION') THEN 1 END) AS inProgressCapas,
            COUNT(CASE WHEN status = 'EFFECTIVENESS_REVIEW' THEN 1 END) AS pendingEffectivenessCapas,
            COUNT(CASE WHEN status NOT IN ('CLOSED', 'VOID') AND target_completion_date < CURRENT_DATE THEN 1 END) AS overdueCapas,
            COUNT(CASE WHEN risk_level IN ('CRITICAL', 'HIGH') THEN 1 END) AS criticalOrHighRiskCapas,
            COUNT(CASE WHEN status = 'CLOSED' AND effectiveness_result = 'EFFECTIVE' THEN 1 END) AS closedEffectiveCapas
        FROM capa_records
    """, nativeQuery = true)
    CapaKpiProjection getKpiSummary();

    interface CapaKpiProjection {
        long getTotalCapas();
        long getInProgressCapas();
        long getPendingEffectivenessCapas();
        long getOverdueCapas();
        long getCriticalOrHighRiskCapas();
        long getClosedEffectiveCapas();
    }
}
