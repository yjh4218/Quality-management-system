package com.example.ims.repository;

import com.example.ims.entity.WmsInboundHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WmsInboundHistoryRepository extends JpaRepository<WmsInboundHistory, Long> {
    List<WmsInboundHistory> findByWmsInboundIdOrderByModifiedAtDesc(Long wmsInboundId);
}
