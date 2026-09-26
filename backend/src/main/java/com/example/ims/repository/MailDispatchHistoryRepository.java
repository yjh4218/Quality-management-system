package com.example.ims.repository;

import com.example.ims.entity.MailDispatchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MailDispatchHistoryRepository extends JpaRepository<MailDispatchHistory, Long> {

    List<MailDispatchHistory> findByDomainAndSourceIdOrderBySentAtDesc(String domain, Long sourceId);

    List<MailDispatchHistory> findByDomainAndSourceIdOrderBySentAtAsc(String domain, Long sourceId);

    List<MailDispatchHistory> findByStatus(String status);

    List<MailDispatchHistory> findByStatusAndSentAtBefore(String status, LocalDateTime threshold);

    @Query("SELECT m.manufacturer AS manufacturer, " +
           "COUNT(m) AS totalDispatches, " +
           "SUM(CASE WHEN m.status = 'REPLIED' THEN 1L ELSE 0L END) AS repliedCount, " +
           "SUM(CASE WHEN m.status = 'PENDING' THEN 1L ELSE 0L END) AS pendingCount, " +
           "SUM(CASE WHEN m.status = 'OVERDUE' THEN 1L ELSE 0L END) AS overdueCount, " +
           "AVG(m.leadTimeHours) AS avgLeadTimeHours, " +
           "MIN(m.leadTimeHours) AS minLeadTimeHours, " +
           "MAX(m.leadTimeHours) AS maxLeadTimeHours, " +
           "AVG(CAST(m.reminderCount AS double)) AS avgReminderCount " +
           "FROM MailDispatchHistory m " +
           "WHERE m.manufacturer IS NOT NULL AND m.manufacturer <> '' " +
           "GROUP BY m.manufacturer")
    List<ManufacturerLeadTimeStatsProjection> getManufacturerLeadTimeStats();

    interface ManufacturerLeadTimeStatsProjection {
        String getManufacturer();
        Long getTotalDispatches();
        Long getRepliedCount();
        Long getPendingCount();
        Long getOverdueCount();
        Double getAvgLeadTimeHours();
        Double getMinLeadTimeHours();
        Double getMaxLeadTimeHours();
        Double getAvgReminderCount();
    }
}
