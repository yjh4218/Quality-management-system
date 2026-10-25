package com.example.ims.repository;

import com.example.ims.entity.BarcodeRecord;
import com.example.ims.entity.BarcodeStatus;
import com.example.ims.entity.BarcodeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BarcodeRecordRepository extends JpaRepository<BarcodeRecord, Long> {

    Optional<BarcodeRecord> findByBarcodeValue(String barcodeValue);

    List<BarcodeRecord> findByBatchNumber(String batchNumber);

    @Query("SELECT r FROM BarcodeRecord r WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(r.barcodeValue) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(r.batchNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(r.gtin) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(r.serialNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:barcodeType IS NULL OR r.barcodeType = :barcodeType) AND " +
           "(:status IS NULL OR r.status = :status) " +
           "ORDER BY r.id DESC")
    Page<BarcodeRecord> searchBarcodes(
            @Param("keyword") String keyword,
            @Param("barcodeType") BarcodeType barcodeType,
            @Param("status") BarcodeStatus status,
            Pageable pageable
    );
}
