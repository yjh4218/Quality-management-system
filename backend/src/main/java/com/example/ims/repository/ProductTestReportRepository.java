package com.example.ims.repository;

import com.example.ims.entity.ProductTestReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductTestReportRepository extends JpaRepository<ProductTestReport, Long> {
    List<ProductTestReport> findByProductIdAndIsDeletedFalse(Long productId);
}
