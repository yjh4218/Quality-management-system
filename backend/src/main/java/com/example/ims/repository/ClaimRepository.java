package com.example.ims.repository;

import com.example.ims.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long>, JpaSpecificationExecutor<Claim> {
    List<Claim> findByManufacturer(String manufacturer);
    List<Claim> findByReceiptDateAfter(LocalDate date);
    List<Claim> findByReceiptDateBetween(LocalDate startDate, LocalDate endDate);
    List<Claim> findByReceiptDateAfterOrderByReceiptDateDesc(LocalDate date);
    List<Claim> findTop50ByReceiptDateAfterOrderByReceiptDateDesc(LocalDate date);

    List<Claim> findTop50ByManufacturerAndReceiptDateAfterOrderByReceiptDateDesc(String manufacturer, LocalDate date);
    java.util.Optional<Claim> findByClaimNumber(String claimNumber);
    long countByReceiptDate(LocalDate date);

    // [신규] 제조사 품질 답변 완료 알림용
    List<Claim> findTop50ByMfrTerminationDateAfterOrderByMfrTerminationDateDesc(LocalDate date);

    // [휴지통] 삭제된 항목 조회 (명시적 JPQL)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Claim c WHERE c.isDeleted = true ORDER BY c.updatedAt DESC")
    List<Claim> findDeletedClaims();

    /**
     * PostgreSQL 시퀀스 기반 클레임 채번 (동시성 보장)
     */
    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('claim_number_seq')", nativeQuery = true)
    Long getNextClaimSequence();
}
