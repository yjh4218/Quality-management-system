package com.example.ims.repository;

import com.example.ims.entity.TraceabilityLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TraceabilityLinkRepository extends JpaRepository<TraceabilityLink, Long> {

    // 역방향 탐색: 자식 LOT 번호로 투입된 부모 LOT들 조회
    List<TraceabilityLink> findByChildBatchNumber(String childBatchNumber);

    // 정방향 탐색: 부모 LOT 번호로 산출된 자식 LOT들 조회
    List<TraceabilityLink> findByParentBatchNumber(String parentBatchNumber);

    List<TraceabilityLink> findByChildBatchNumberIn(List<String> childBatchNumbers);

    List<TraceabilityLink> findByParentBatchNumberIn(List<String> parentBatchNumbers);

    boolean existsByParentBatchNumberAndChildBatchNumber(String parentBatchNumber, String childBatchNumber);
}
