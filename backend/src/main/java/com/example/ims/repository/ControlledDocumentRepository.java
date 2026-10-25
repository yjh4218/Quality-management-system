package com.example.ims.repository;

import com.example.ims.entity.ControlledDocStatus;
import com.example.ims.entity.ControlledDocType;
import com.example.ims.entity.ControlledDocument;
import com.example.ims.entity.ProductFamily;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ControlledDocumentRepository extends JpaRepository<ControlledDocument, Long> {

    @Query("SELECT d FROM ControlledDocument d WHERE d.isDeleted = false " +
            "AND (:keyword IS NULL OR :keyword = '' OR " +
            "     LOWER(d.docNo) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "     LOWER(d.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "     LOWER(d.authorName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "     LOWER(d.department) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:docType IS NULL OR d.docType = :docType) " +
            "AND (:status IS NULL OR d.status = :status) " +
            "AND (:targetFamily IS NULL OR d.targetFamily = :targetFamily)")
    Page<ControlledDocument> findDocumentsPaged(
            @Param("keyword") String keyword,
            @Param("docType") ControlledDocType docType,
            @Param("status") ControlledDocStatus status,
            @Param("targetFamily") ProductFamily targetFamily,
            Pageable pageable);

    /** 특정 문서 번호의 전체 개정 이력 역순(최신순) 조회 */
    List<ControlledDocument> findByDocNoAndIsDeletedFalseOrderByRevisionIntDesc(String docNo);

    /** 특정 문서 번호와 리비전 번호의 중복 여부 확인 */
    boolean existsByDocNoAndRevisionNoAndIsDeletedFalse(String docNo, String revisionNo);

    /** 특정 문서 번호의 현재 유효(EFFECTIVE) 버전 조회 */
    Optional<ControlledDocument> findFirstByDocNoAndStatusAndIsDeletedFalse(String docNo, ControlledDocStatus status);

    /** 메트릭 집계 */
    long countByIsDeletedFalse();

    long countByStatusAndIsDeletedFalse(ControlledDocStatus status);

    long countByDocTypeAndIsDeletedFalse(ControlledDocType docType);

    long countByTargetFamilyAndIsDeletedFalse(ProductFamily targetFamily);
}
