package com.example.ims.service;

import com.example.ims.entity.SalesChannel;
import com.example.ims.repository.SalesChannelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SalesChannelService {

    private final SalesChannelRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<SalesChannel> getAllChannels() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<SalesChannel> getActiveChannels() {
        return repository.findAll().stream().filter(SalesChannel::isActive).toList();
    }

    @Transactional
    public SalesChannel saveChannel(SalesChannel channel, String username) {
        boolean isNew = channel.getId() == null;
        if (isNew && repository.existsByName(channel.getName())) {
            throw new RuntimeException("이미 존재하는 채널명입니다: " + channel.getName());
        }
        channel.setUpdatedBy(username);
        SalesChannel saved = repository.save(channel);

        auditLogService.logAction(username, isNew ? "SALES_CHANNEL_CREATE" : "SALES_CHANNEL_UPDATE", 
                "유통채널 " + (isNew ? "신규 등록" : "정보 수정"), 
                String.format("유통채널 [ID: %d, 채널명: %s]", saved.getId(), saved.getName()));
        return saved;
    }

    @Transactional
    public void deleteChannel(Long id) {
        repository.findById(id).ifPresent(ch -> {
            ch.setIsDeleted(true);
            SalesChannel saved = repository.save(ch);
            auditLogService.logAction(ch.getUpdatedBy() != null ? ch.getUpdatedBy() : "SYSTEM", "SALES_CHANNEL_DELETE",
                    "유통채널 삭제", String.format("유통채널 [ID: %d, 채널명: %s] 삭제", id, ch.getName()));
        });
    }

    @Transactional
    public void toggleActive(Long id) {
        repository.findById(id).ifPresent(ch -> {
            ch.setActive(!ch.isActive());
            SalesChannel saved = repository.save(ch);
            auditLogService.logAction(ch.getUpdatedBy() != null ? ch.getUpdatedBy() : "SYSTEM", "SALES_CHANNEL_TOGGLE",
                    "유통채널 상태 변경", String.format("유통채널 [ID: %d, 채널명: %s] 활성화 상태 -> %b", id, ch.getName(), saved.isActive()));
        });
    }
}
