package com.example.ims.repository;

import com.example.ims.entity.ApprovalDocType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalDocTypeRepository extends JpaRepository<ApprovalDocType, Long> {
    Optional<ApprovalDocType> findByCode(String code);
    List<ApprovalDocType> findByIsActiveTrueOrderByNameAsc();
    boolean existsByCode(String code);
}
