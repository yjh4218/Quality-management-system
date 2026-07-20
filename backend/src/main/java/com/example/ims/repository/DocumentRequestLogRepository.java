package com.example.ims.repository;

import com.example.ims.entity.DocumentRequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRequestLogRepository extends JpaRepository<DocumentRequestLog, Long> {
    
    Optional<DocumentRequestLog> findByUploadToken(String uploadToken);
    
    List<DocumentRequestLog> findByRequirementId(Long requirementId);
    
    // 리마인드 대상 조회용 (요청일로부터 7일 이상 경과하고 reminderCount가 0인 로그들)
    List<DocumentRequestLog> findByRequestedAtBeforeAndReminderCount(LocalDateTime dateTime, int reminderCount);
}
