package com.example.ims.repository;

import com.example.ims.entity.EnvironmentalArea;
import com.example.ims.entity.EnvironmentalMonitoring;
import com.example.ims.entity.EnvironmentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnvironmentalMonitoringRepository extends JpaRepository<EnvironmentalMonitoring, Long>, JpaSpecificationExecutor<EnvironmentalMonitoring> {

    Optional<EnvironmentalMonitoring> findByMonitoringNumber(String monitoringNumber);

    Optional<EnvironmentalMonitoring> findTopByMonitoringNumberStartingWithOrderByMonitoringNumberDesc(String prefix);

    List<EnvironmentalMonitoring> findAllByIsDeletedFalseOrderByMonitoringDateDesc();

    List<EnvironmentalMonitoring> findAllByAreaAndIsDeletedFalseOrderByMonitoringDateDesc(EnvironmentalArea area);

    long countByStatusAndIsDeletedFalse(EnvironmentalStatus status);

    long countByStatusInAndMonitoringDateAfterAndIsDeletedFalse(List<EnvironmentalStatus> statuses, LocalDateTime afterDate);
}
