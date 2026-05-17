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

    // [휴지통] 삭제된 항목 조회 (Native Query로 SQLRestriction 우회)
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM claims WHERE is_deleted = true ORDER BY updated_at DESC", nativeQuery = true)
    List<Claim> findDeletedClaims();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE claims SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void restoreClaim(Long id);

    /**
     * PostgreSQL 시퀀스 기반 클레임 채번 (동시성 보장)
     */
    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('claim_number_seq')", nativeQuery = true)
    Long getNextClaimSequence();
}
