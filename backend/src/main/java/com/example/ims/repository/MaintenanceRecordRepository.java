package com.example.ims.repository;

import com.example.ims.entity.MaintenanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, Long>, JpaSpecificationExecutor<MaintenanceRecord> {

    Optional<MaintenanceRecord> findByMaintenanceNumber(String maintenanceNumber);

    Optional<MaintenanceRecord> findTopByMaintenanceNumberStartingWithOrderByMaintenanceNumberDesc(String prefix);

    List<MaintenanceRecord> findAllByIsDeletedFalseOrderByMaintenanceDateDesc();

    List<MaintenanceRecord> findAllByEquipmentIdAndIsDeletedFalseOrderByMaintenanceDateDesc(Long equipmentId);
}
