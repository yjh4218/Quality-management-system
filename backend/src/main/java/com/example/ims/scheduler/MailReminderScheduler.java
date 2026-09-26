package com.example.ims.scheduler;

import com.example.ims.entity.MailDispatchHistory;
import com.example.ims.entity.MailTemplate;
import com.example.ims.repository.MailDispatchHistoryRepository;
import com.example.ims.repository.MailTemplateRepository;
import com.example.ims.service.EmailService;
import com.example.ims.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MailReminderScheduler {

    private final MailTemplateRepository mailTemplateRepository;
    private final MailDispatchHistoryRepository mailDispatchHistoryRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    // 평일 오전 9시 자동 리마인드 점검 및 발송 (Zero-Cost 정책)
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "Asia/Seoul")
    @Transactional
    public void processAutoReminders() {
        log.info("[MailReminderScheduler] Starting auto-reminder check...");
        List<MailTemplate> activeTemplates = mailTemplateRepository.findByDeletedFalseOrderByUpdatedAtDesc();

        for (MailTemplate template : activeTemplates) {
            if (!Boolean.TRUE.equals(template.getAutoReminderEnabled())) {
                continue;
            }

            int intervalDays = template.getReminderIntervalDays() != null && template.getReminderIntervalDays() > 0
                    ? template.getReminderIntervalDays() : 3;
            int maxReminders = template.getMaxReminderCount() != null && template.getMaxReminderCount() > 0
                    ? template.getMaxReminderCount() : 2;

            LocalDateTime threshold = LocalDateTime.now().minusDays(intervalDays);

            List<MailDispatchHistory> pendingHistories = mailDispatchHistoryRepository
                    .findByStatusAndSentAtBefore("PENDING", threshold);

            for (MailDispatchHistory history : pendingHistories) {
                if (!template.getTemplateCode().equals(history.getTemplateCode())) {
                    continue;
                }

                int currentCount = history.getReminderCount() != null ? history.getReminderCount() : 0;

                if (currentCount < maxReminders) {
                    // Send Auto Reminder
                    int nextCount = currentCount + 1;
                    String subject = "[자동 리마인드 " + nextCount + "차] " + history.getSubject().replaceAll("^\\[.*?\\]\\s*", "");

                    emailService.sendCustomEmail(history.getRecipientEmail(), subject, history.getBody());
                    log.info("Sent auto-reminder {} for history id={}, domain={}, recipient={}",
                            nextCount, history.getId(), history.getDomain(), history.getRecipientEmail());

                    history.setReminderCount(nextCount);
                    mailDispatchHistoryRepository.save(history);

                    // Add auto-reminder history record
                    MailDispatchHistory reminderRecord = MailDispatchHistory.builder()
                            .domain(history.getDomain())
                            .sourceId(history.getSourceId())
                            .sourceNumber(history.getSourceNumber())
                            .templateCode(history.getTemplateCode())
                            .templateName(history.getTemplateName())
                            .manufacturer(history.getManufacturer())
                            .recipientEmail(history.getRecipientEmail())
                            .subject(subject)
                            .body(history.getBody())
                            .sentBy("SYSTEM_AUTO_REMINDER")
                            .sentAt(LocalDateTime.now())
                            .dispatchType("AUTO_REMINDER")
                            .reminderCount(nextCount)
                            .status("PENDING")
                            .isDeleted(false)
                            .build();
                    mailDispatchHistoryRepository.save(reminderRecord);

                } else {
                    // Overdue threshold reached
                    history.setStatus("OVERDUE");
                    mailDispatchHistoryRepository.save(history);

                    log.warn("Marked history id={} as OVERDUE after {} reminders", history.getId(), currentCount);

                    try {
                        notificationService.createNotification(
                                "🚨 [제조사 회신 지연 경보] " + history.getSourceNumber(),
                                "제조사(" + history.getManufacturer() + ")가 리마인드 " + currentCount + "회 발송 후에도 회신하지 않아 지연 상태로 전환되었습니다.",
                                "MAIL_OVERDUE",
                                null,
                                "ROLE_QUALITY_TEAM",
                                null,
                                "/claims"
                        );
                    } catch (Exception ex) {
                        log.error("Failed to create overdue notification", ex);
                    }
                }
            }
        }
        log.info("[MailReminderScheduler] Auto-reminder check completed.");
    }
}
