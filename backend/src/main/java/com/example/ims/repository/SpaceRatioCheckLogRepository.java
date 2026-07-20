package com.example.ims.repository;

import com.example.ims.entity.SpaceRatioCheckLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 포장공간비율 검증 로그 레포지토리
 */
@Repository
public interface SpaceRatioCheckLogRepository extends JpaRepository<SpaceRatioCheckLog, Long> {
    
    /**
     * 특정 품목코드에 대한 로그 조회 (페이징 보장)
     */
    Page<SpaceRatioCheckLog> findByItemCode(String itemCode, Pageable pageable);
    
    /**
     * 전체 검증 이력 최신순 조회 (페이징 보장)
     */
    Page<SpaceRatioCheckLog> findAllByOrderByCheckedAtDesc(Pageable pageable);
}
