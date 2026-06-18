package com.example.ims.repository;

import com.example.ims.entity.ProductTestReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductTestReportRepository extends JpaRepository<ProductTestReport, Long> {
    List<ProductTestReport> findByProductIdAndIsDeletedFalse(Long productId);
}
