package com.example.ims.repository;

import com.example.ims.entity.Equipment;
import com.example.ims.entity.EquipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long>, JpaSpecificationExecutor<Equipment> {

    Optional<Equipment> findByEquipmentCode(String equipmentCode);

    Optional<Equipment> findTopByEquipmentCodeStartingWithOrderByEquipmentCodeDesc(String prefix);

    List<Equipment> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    List<Equipment> findAllByStatusAndIsDeletedFalse(EquipmentStatus status);

    @Query("""
        SELECT e FROM Equipment e
        WHERE e.isDeleted = false
          AND e.nextCalibrationDueDate IS NOT NULL
          AND e.nextCalibrationDueDate < :today
          AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED
        ORDER BY e.nextCalibrationDueDate ASC
    """)
    List<Equipment> findOverdueCalibrations(@Param("today") LocalDate today);

    @Query("""
        SELECT e FROM Equipment e
        WHERE e.isDeleted = false
          AND e.nextCalibrationDueDate IS NOT NULL
          AND e.nextCalibrationDueDate >= :today
          AND e.nextCalibrationDueDate <= :thirtyDaysLater
          AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED
        ORDER BY e.nextCalibrationDueDate ASC
    """)
    List<Equipment> findDueSoonCalibrations(@Param("today") LocalDate today, @Param("thirtyDaysLater") LocalDate thirtyDaysLater);

    @Query("""
        SELECT e FROM Equipment e
        WHERE e.isDeleted = false
          AND e.nextPmDueDate IS NOT NULL
          AND e.nextPmDueDate <= :thirtyDaysLater
          AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED
        ORDER BY e.nextPmDueDate ASC
    """)
    List<Equipment> findDueSoonPm(@Param("thirtyDaysLater") LocalDate thirtyDaysLater);

    @Query("""
        SELECT
            COUNT(e) AS totalEquipment,
            SUM(CASE WHEN e.status = com.example.ims.entity.EquipmentStatus.OPERATIONAL THEN 1L ELSE 0L END) AS operationalEquipment,
            SUM(CASE WHEN e.status = com.example.ims.entity.EquipmentStatus.UNDER_MAINTENANCE THEN 1L ELSE 0L END) AS maintenanceEquipment,
            SUM(CASE WHEN e.status = com.example.ims.entity.EquipmentStatus.OUT_OF_SERVICE THEN 1L ELSE 0L END) AS outOfServiceEquipment,
            SUM(CASE WHEN e.nextCalibrationDueDate IS NOT NULL AND e.nextCalibrationDueDate < :today AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED THEN 1L ELSE 0L END) AS overdueCalibrations,
            SUM(CASE WHEN e.nextCalibrationDueDate IS NOT NULL AND e.nextCalibrationDueDate >= :today AND e.nextCalibrationDueDate <= :thirtyDaysLater AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED THEN 1L ELSE 0L END) AS dueSoonCalibrations,
            SUM(CASE WHEN e.nextPmDueDate IS NOT NULL AND e.nextPmDueDate <= :thirtyDaysLater AND e.status != com.example.ims.entity.EquipmentStatus.DECOMMISSIONED THEN 1L ELSE 0L END) AS dueSoonPm
        FROM Equipment e
        WHERE e.isDeleted = false
    """)
    EquipmentKpiProjection getEquipmentKpiSummary(@Param("today") LocalDate today, @Param("thirtyDaysLater") LocalDate thirtyDaysLater);

    interface EquipmentKpiProjection {
        Long getTotalEquipment();
        Long getOperationalEquipment();
        Long getMaintenanceEquipment();
        Long getOutOfServiceEquipment();
        Long getOverdueCalibrations();
        Long getDueSoonCalibrations();
        Long getDueSoonPm();
    }
}
