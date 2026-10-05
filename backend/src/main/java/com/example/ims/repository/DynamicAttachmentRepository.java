package com.example.ims.repository;

import com.example.ims.entity.DynamicAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DynamicAttachmentRepository extends JpaRepository<DynamicAttachment, Long> {
    List<DynamicAttachment> findByScreenIdAndRecordId(Long screenId, Long recordId);
    List<DynamicAttachment> findByScreenIdAndRecordIdAndFieldKey(Long screenId, Long recordId, String fieldKey);
}
