package com.example.ims.repository;

import com.example.ims.entity.NcrActionItem;
import com.example.ims.entity.NcrActionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NcrActionItemRepository extends JpaRepository<NcrActionItem, Long> {

    List<NcrActionItem> findByNcrReportIdOrderByItemOrderAscIdAsc(Long ncrId);

    List<NcrActionItem> findByStatus(NcrActionStatus status);

    long countByNcrReportIdAndStatus(Long ncrId, NcrActionStatus status);
}
