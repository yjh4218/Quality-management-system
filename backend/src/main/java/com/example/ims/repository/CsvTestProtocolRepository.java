package com.example.ims.repository;

import com.example.ims.entity.CsvTestProtocol;
import com.example.ims.entity.TestResultStatus;
import com.example.ims.entity.ValidationTestPhase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CsvTestProtocolRepository extends JpaRepository<CsvTestProtocol, Long> {
    Optional<CsvTestProtocol> findByProtocolNumberAndIsDeletedFalse(String protocolNumber);
    List<CsvTestProtocol> findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(Long projectId);
    List<CsvTestProtocol> findByProjectIdAndTestPhaseAndIsDeletedFalseOrderByDisplayOrderAsc(Long projectId, ValidationTestPhase testPhase);
    List<CsvTestProtocol> findByIsDeletedFalseOrderByProjectIdAscDisplayOrderAsc();
    long countByProjectIdAndIsDeletedFalse(Long projectId);
    long countByProjectIdAndResultStatusAndIsDeletedFalse(Long projectId, TestResultStatus resultStatus);
    long countByIsDeletedFalse();
    long countByResultStatusAndIsDeletedFalse(TestResultStatus resultStatus);
}
