package com.example.ims.repository;

import com.example.ims.entity.OfficialOriginalType;
import com.example.ims.entity.OfficialRecordPolicy;
import com.example.ims.entity.RecordCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfficialRecordPolicyRepository extends JpaRepository<OfficialRecordPolicy, Long> {

    Optional<OfficialRecordPolicy> findByPolicyCode(String policyCode);

    List<OfficialRecordPolicy> findByRecordCategory(RecordCategory recordCategory);

    List<OfficialRecordPolicy> findAllByOrderByPolicyCodeAsc();

    long countByIsActiveTrue();

    long countByOfficialOriginalType(OfficialOriginalType officialOriginalType);
}
