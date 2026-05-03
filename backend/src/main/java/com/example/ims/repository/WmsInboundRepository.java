package com.example.ims.repository;

import com.example.ims.entity.WmsInbound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.time.LocalDateTime;

public interface WmsInboundRepository extends JpaRepository<WmsInbound, Long>, JpaSpecificationExecutor<WmsInbound> {
    List<WmsInbound> findByManufacturer(String manufacturer);

    List<WmsInbound> findByManufacturerAndOverallStatus(String manufacturer, WmsInbound.OverallStatus status);

    List<WmsInbound> findByInboundDateAfter(LocalDateTime date);
    List<WmsInbound> findTop50ByInboundDateAfterOrderByInboundDateDesc(LocalDateTime date);

    List<WmsInbound> findByManufacturerAndInboundDateAfter(String manufacturer, LocalDateTime date);
    List<WmsInbound> findTop50ByManufacturerAndInboundDateAfterOrderByInboundDateDesc(String manufacturer, LocalDateTime date);

    List<WmsInbound> findByQualityDecisionDate(String qualityDecisionDate);
    java.util.Optional<WmsInbound> findByGrnNumber(String grnNumber);
    long countByInboundDateBetween(LocalDateTime start, LocalDateTime end);

    // [휴지통] 삭제된 항목 조회 (Native Query로 @SQLRestriction 우회)
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM wms_inbound WHERE is_deleted = true ORDER BY last_modified_at DESC", nativeQuery = true)
    List<WmsInbound> findDeletedInbounds();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE wms_inbound SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void restoreInbound(Long id);
}
