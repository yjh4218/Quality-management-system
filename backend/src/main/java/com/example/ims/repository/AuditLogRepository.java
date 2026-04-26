package com.example.ims.repository;

import com.example.ims.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByModifiedAtDesc();

    List<AuditLog> findByEntityTypeAndEntityIdOrderByModifiedAtDesc(String entityType, Long entityId);

    List<AuditLog> findByModifiedAtBetweenOrderByModifiedAtDesc(LocalDateTime start, LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM AuditLog a WHERE " +
            "(:entityType IS NULL OR a.entityType = :entityType) AND " +
            "(:search IS NULL OR CAST(a.entityId AS string) LIKE :search OR LOWER(CAST(a.description AS string)) LIKE LOWER(:search)) AND " +
            "(:start IS NULL OR a.modifiedAt >= :start) AND " +
            "(:end IS NULL OR a.modifiedAt <= :end) " +
            "ORDER BY a.modifiedAt DESC")
    org.springframework.data.domain.Page<AuditLog> searchLogs(
            @org.springframework.data.repository.query.Param("entityType") String entityType,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end,
            org.springframework.data.domain.Pageable pageable);

    List<AuditLog> findByModifiedAtAfter(LocalDateTime modifiedAt);

    List<AuditLog> findTop50ByModifiedAtAfterOrderByModifiedAtDesc(LocalDateTime modifiedAt);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "INSERT INTO audit_logs_archive (id, entity_type, entity_id, action, modifier, modified_at, description, old_value, new_value) " +
            "SELECT id, entity_type, entity_id, action, modifier, modified_at, description, old_value, new_value FROM audit_logs " +
            "WHERE modified_at < :cutOffDate", nativeQuery = true)
    int archiveOldLogs(@org.springframework.data.repository.query.Param("cutOffDate") LocalDateTime cutOffDate);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM audit_logs WHERE modified_at < :cutOffDate", nativeQuery = true)
    int deleteArchivedLogs(@org.springframework.data.repository.query.Param("cutOffDate") LocalDateTime cutOffDate);
}
