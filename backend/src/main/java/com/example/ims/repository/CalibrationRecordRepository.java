package com.example.ims.repository;

import com.example.ims.entity.CalibrationRecord;
import com.example.ims.entity.CalibrationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CalibrationRecordRepository extends JpaRepository<CalibrationRecord, Long>, JpaSpecificationExecutor<CalibrationRecord> {

    Optional<CalibrationRecord> findByCalibrationNumber(String calibrationNumber);

    Optional<CalibrationRecord> findTopByCalibrationNumberStartingWithOrderByCalibrationNumberDesc(String prefix);

    List<CalibrationRecord> findAllByIsDeletedFalseOrderByCalibrationDateDesc();

    List<CalibrationRecord> findAllByEquipmentIdAndIsDeletedFalseOrderByCalibrationDateDesc(Long equipmentId);

    long countByResultAndIsDeletedFalse(CalibrationResult result);
}
