package com.example.ims.service;

import com.example.ims.entity.MailDispatchHistory;
import com.example.ims.entity.MailTemplate;
import com.example.ims.repository.MailDispatchHistoryRepository;
import com.example.ims.repository.MailTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailDispatchHistoryService {

    private final MailDispatchHistoryRepository mailDispatchHistoryRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final EmailService emailService;

    // Rate Limiting (60초 제한) for Manual Reminder
    private final ConcurrentHashMap<Long, Long> reminderRateLimitMap = new ConcurrentHashMap<>();

    @Transactional
    @CacheEvict(value = "mailHistoryStats", allEntries = true)
    public MailDispatchHistory recordDispatch(String domain,
                                              Long sourceId,
                                              String sourceNumber,
                                              String templateCode,
                                              String templateName,
                                              String manufacturer,
                                              String recipientEmail,
                                              String subject,
                                              String body,
                                              String sentBy,
                                              String dispatchType,
                                              Integer reminderCount) {
        MailDispatchHistory history = MailDispatchHistory.builder()
                .domain(domain)
                .sourceId(sourceId)
                .sourceNumber(sourceNumber)
                .templateCode(templateCode)
                .templateName(templateName)
                .manufacturer(manufacturer)
                .recipientEmail(recipientEmail)
                .subject(subject)
                .body(body)
                .sentBy(sentBy != null ? sentBy : "SYSTEM")
                .sentAt(LocalDateTime.now())
                .dispatchType(dispatchType != null ? dispatchType : "MANUAL")
                .reminderCount(reminderCount != null ? reminderCount : 0)
                .status("PENDING")
                .isDeleted(false)
                .build();

        MailDispatchHistory saved = mailDispatchHistoryRepository.save(history);

        // 보관 개수 제한 (Retention limit)
        int maxHistory = 20;
        if (templateCode != null && !templateCode.isEmpty()) {
            MailTemplate template = mailTemplateRepository.findByTemplateCodeAndDeletedFalse(templateCode).orElse(null);
            if (template != null && template.getMaxHistoryCount() != null && template.getMaxHistoryCount() > 0) {
                maxHistory = template.getMaxHistoryCount();
            }
        }

        enforceHistoryRetention(domain, sourceId, maxHistory);
        return saved;
    }

    private void enforceHistoryRetention(String domain, Long sourceId, int maxHistory) {
        List<MailDispatchHistory> activeHistories = mailDispatchHistoryRepository.findByDomainAndSourceIdOrderBySentAtAsc(domain, sourceId);
        int excess = activeHistories.size() - maxHistory;
        if (excess > 0) {
            for (int i = 0; i < excess; i++) {
                MailDispatchHistory old = activeHistories.get(i);
                old.setIsDeleted(true);
                mailDispatchHistoryRepository.save(old);
            }
            log.info("Enforced retention limit ({}): soft-deleted {} oldest mail histories for domain={}, sourceId={}",
                    maxHistory, excess, domain, sourceId);
        }
    }

    @Transactional
    @CacheEvict(value = "mailHistoryStats", allEntries = true)
    public void recordReply(String domain, Long sourceId, LocalDateTime replyTime, String remarks) {
        List<MailDispatchHistory> histories = mailDispatchHistoryRepository.findByDomainAndSourceIdOrderBySentAtDesc(domain, sourceId);
        boolean updated = false;
        LocalDateTime effectiveReplyTime = replyTime != null ? replyTime : LocalDateTime.now();
        for (MailDispatchHistory h : histories) {
            if ("PENDING".equals(h.getStatus()) || "OVERDUE".equals(h.getStatus())) {
                h.markAsReplied(effectiveReplyTime, remarks);
                mailDispatchHistoryRepository.save(h);
                updated = true;
                log.info("Recorded reply for mail history id={}, leadTimeHours={}", h.getId(), h.getLeadTimeHours());
            }
        }
        if (!updated) {
            log.debug("No PENDING/OVERDUE mail dispatch history found for domain={}, sourceId={}", domain, sourceId);
        }
    }

    @Transactional
    @CacheEvict(value = "mailHistoryStats", allEntries = true)
    public MailDispatchHistory markRepliedById(Long id, String remarks) {
        MailDispatchHistory history = mailDispatchHistoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("메일 발송 이력을 찾을 수 없습니다: " + id));
        LocalDateTime now = LocalDateTime.now();
        history.markAsReplied(now, remarks);
        MailDispatchHistory saved = mailDispatchHistoryRepository.save(history);

        // 동일 문서(도메인 + 원천 ID)에 연결된 이전 미회신(PENDING, OVERDUE) 발송 건들도 함께 일괄 회신 완료 처리
        if (history.getDomain() != null && history.getSourceId() != null) {
            List<MailDispatchHistory> relatedList = mailDispatchHistoryRepository
                    .findByDomainAndSourceIdOrderBySentAtDesc(history.getDomain(), history.getSourceId());
            for (MailDispatchHistory item : relatedList) {
                if (!item.getId().equals(history.getId()) &&
                    ("PENDING".equals(item.getStatus()) || "OVERDUE".equals(item.getStatus()))) {
                    item.markAsReplied(now, remarks != null ? remarks : "동일 문서 회신 확인에 따른 일괄 완료 처리");
                    mailDispatchHistoryRepository.save(item);
                    log.info("Batch completed related mail history id={} for sourceNumber={}", item.getId(), item.getSourceNumber());
                }
            }
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<MailDispatchHistory> getHistoriesByDomainAndSource(String domain, Long sourceId) {
        return mailDispatchHistoryRepository.findByDomainAndSourceIdOrderBySentAtDesc(domain, sourceId);
    }

    @Transactional(readOnly = true)
    public List<MailDispatchHistory> getAllHistories() {
        return mailDispatchHistoryRepository.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "sentAt")
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "mailHistoryStats", sync = true)
    public List<MailDispatchHistoryRepository.ManufacturerLeadTimeStatsProjection> getManufacturerLeadTimeStats() {
        return mailDispatchHistoryRepository.getManufacturerLeadTimeStats();
    }

    @Transactional
    @CacheEvict(value = "mailHistoryStats", allEntries = true)
    public MailDispatchHistory sendManualReminder(Long historyId, String requesterName) {
        MailDispatchHistory origin = mailDispatchHistoryRepository.findById(historyId)
                .orElseThrow(() -> new EntityNotFoundException("발송 이력을 찾을 수 없습니다: " + historyId));

        // Rate limiting 방어 (최소 60초 간격)
        long now = System.currentTimeMillis();
        Long lastSent = reminderRateLimitMap.get(historyId);
        if (lastSent != null && (now - lastSent) < 60_000L) {
            long remainingSec = (60_000L - (now - lastSent)) / 1000L;
            throw new IllegalStateException("리마인드 메일은 1분에 1회만 발송 가능합니다. (" + remainingSec + "초 후 재시도 가능)");
        }

        int nextReminderCount = (origin.getReminderCount() != null ? origin.getReminderCount() : 0) + 1;
        String reminderSubject = "[리마인드 " + nextReminderCount + "차] " + origin.getSubject().replaceAll("^\\[리마인드 \\d+차\\]\\s*", "");

        // 메일 발송
        emailService.sendCustomEmail(origin.getRecipientEmail(), reminderSubject, origin.getBody());
        reminderRateLimitMap.put(historyId, now);

        // 원본 이력의 리마인드 횟수 갱신
        origin.setReminderCount(nextReminderCount);
        mailDispatchHistoryRepository.save(origin);

        // 신규 리마인드 발송 이력 기록
        MailDispatchHistory reminderRecord = MailDispatchHistory.builder()
                .domain(origin.getDomain())
                .sourceId(origin.getSourceId())
                .sourceNumber(origin.getSourceNumber())
                .templateCode(origin.getTemplateCode())
                .templateName(origin.getTemplateName())
                .manufacturer(origin.getManufacturer())
                .recipientEmail(origin.getRecipientEmail())
                .subject(reminderSubject)
                .body(origin.getBody())
                .sentBy(requesterName != null ? requesterName : "SYSTEM")
                .sentAt(LocalDateTime.now())
                .dispatchType("MANUAL_REMINDER")
                .reminderCount(nextReminderCount)
                .status("PENDING")
                .isDeleted(false)
                .build();

        return mailDispatchHistoryRepository.save(reminderRecord);
    }
}
