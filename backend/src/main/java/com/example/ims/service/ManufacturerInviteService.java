package com.example.ims.service;

import com.example.ims.entity.Manufacturer;
import com.example.ims.entity.ManufacturerInviteToken;
import com.example.ims.repository.ManufacturerInviteTokenRepository;
import com.example.ims.repository.ManufacturerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ManufacturerInviteService {

    private final ManufacturerInviteTokenRepository inviteTokenRepository;
    private final ManufacturerRepository manufacturerRepository;

    /**
     * 특정 제조사에 대한 7일 유효 초대 토큰 생성
     */
    public ManufacturerInviteToken createInviteToken(Long manufacturerId, String createdBy) {
        Manufacturer manufacturer = manufacturerRepository.findById(manufacturerId)
                .orElseThrow(() -> new IllegalArgumentException("해당 제조사를 찾을 수 없습니다."));

        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        ManufacturerInviteToken inviteToken = ManufacturerInviteToken.builder()
                .manufacturer(manufacturer)
                .token(token)
                .createdBy(createdBy)
                .expiresAt(expiresAt)
                .build();

        log.info("[INVITE] Created invite token for manufacturer '{}' (ID: {}) by {}", manufacturer.getName(), manufacturerId, createdBy);
        return inviteTokenRepository.save(inviteToken);
    }

    /**
     * 초대 토큰 유효성 검증
     */
    @Transactional(readOnly = true)
    public ManufacturerInviteToken validateToken(String token) {
        ManufacturerInviteToken inviteToken = inviteTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 존재하지 않는 초대 링크입니다."));

        if (!inviteToken.isValid()) {
            if (inviteToken.getUsedAt() != null) {
                throw new IllegalStateException("이미 사용된 초대 링크입니다.");
            }
            throw new IllegalStateException("만료된 초대 링크입니다.");
        }

        return inviteToken;
    }

    /**
     * 토큰 사용 처리
     */
    public void consumeToken(ManufacturerInviteToken inviteToken) {
        inviteToken.setUsedAt(LocalDateTime.now());
        inviteTokenRepository.save(inviteToken);
        log.info("[INVITE] Consumed invite token for manufacturer '{}'", inviteToken.getManufacturer().getName());
    }
}
