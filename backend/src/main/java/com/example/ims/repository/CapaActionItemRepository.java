package com.example.ims.repository;

import com.example.ims.entity.CapaActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CapaActionItemRepository extends JpaRepository<CapaActionItem, Long> {

    List<CapaActionItem> findByCapaRecordId(Long capaId);

    long countByCapaRecordIdAndStatusNot(Long capaId, String status);
}
