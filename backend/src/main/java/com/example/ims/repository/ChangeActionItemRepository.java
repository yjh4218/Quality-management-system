package com.example.ims.repository;

import com.example.ims.entity.ChangeActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 🔄 변경실행 조치항목(ChangeActionItem) 데이터 접근 레포지토리
 */
@Repository
public interface ChangeActionItemRepository extends JpaRepository<ChangeActionItem, Long> {

    List<ChangeActionItem> findByChangeRequestIdAndIsDeletedFalseOrderByActionOrderAsc(Long changeRequestId);

    Optional<ChangeActionItem> findByIdAndIsDeletedFalse(Long id);

    long countByChangeRequestIdAndIsDeletedFalse(Long changeRequestId);

    long countByChangeRequestIdAndStatusAndIsDeletedFalse(Long changeRequestId, String status);
}
