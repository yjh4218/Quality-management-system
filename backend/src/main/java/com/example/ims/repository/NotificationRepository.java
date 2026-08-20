package com.example.ims.repository;

import com.example.ims.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Optional<Notification> findByNotificationNumber(String notificationNumber);

    /**
     * PostgreSQL/H2 시퀀스 기반 알련번호 채번
     */
    @Query(value = "SELECT nextval('notification_number_seq')", nativeQuery = true)
    Long getNextSequence();

    /**
     * 특정 사용자에게 매핑된 알림 목록을 최신순으로 페이징하여 조회
     */
    @Query("SELECT n FROM Notification n WHERE n.isDeleted = false AND (" +
            "n.targetUsername = :username OR " +
            "(n.targetRole IS NOT NULL AND :roleList IS NOT NULL AND n.targetRole IN :roleList) OR " +
            "(n.targetCompanyName IS NOT NULL AND n.targetCompanyName = :companyName)" +
            ") ORDER BY n.createdAt DESC, n.notificationNumber DESC")
    List<Notification> findActiveNotificationsForUser(
            @Param("username") String username, 
            @Param("roleList") List<String> roleList, 
            @Param("companyName") String companyName,
            Pageable pageable
    );

    /**
     * 특정 사용자 및 본인 역할/회사 기준 읽지 않은 알림 수 집계
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.isDeleted = false AND n.isRead = false AND (" +
            "n.targetUsername = :username OR " +
            "(n.targetRole IS NOT NULL AND :roleList IS NOT NULL AND n.targetRole IN :roleList) OR " +
            "(n.targetCompanyName IS NOT NULL AND n.targetCompanyName = :companyName)" +
            ")")
    long countUnreadNotificationsForUser(
            @Param("username") String username, 
            @Param("roleList") List<String> roleList, 
            @Param("companyName") String companyName
    );
}
