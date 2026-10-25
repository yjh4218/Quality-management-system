package com.example.ims.service;

import com.example.ims.entity.MedicalDeviceProduct;
import com.example.ims.entity.User;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.MedicalDeviceProductRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 의료기기 품목 마스터 서비스.
 * ISO 13485 및 의료기기법 준수를 위한 CRUD, UDI 관리, 감사 추적(Audit Trail), Soft Delete를 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalDeviceProductService {

    private final MedicalDeviceProductRepository repository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    /**
     * 의료기기 품목 목록 검색 및 페이징 조회.
     */
    @Transactional(readOnly = true)
    public Page<MedicalDeviceProduct> getDevicesPaginated(String keyword, String deviceClass, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return repository.searchDevices(keyword, deviceClass, pageable);
    }

    /**
     * 의료기기 단건 조회.
     */
    @Transactional(readOnly = true)
    public Optional<MedicalDeviceProduct> getDeviceById(Long id) {
        return repository.findById(id);
    }

    /**
     * 품목코드 중복 검사.
     */
    @Transactional(readOnly = true)
    public boolean checkItemCodeDuplicate(String itemCode) {
        if (itemCode == null || itemCode.trim().isEmpty()) {
            return false;
        }
        return repository.existsByItemCode(itemCode.trim());
    }

    /**
     * 신규 의료기기 품목 등록.
     */
    @Transactional
    public MedicalDeviceProduct createDevice(MedicalDeviceProduct device, String username) {
        if (device.getItemCode() == null || device.getItemCode().trim().isEmpty()) {
            throw new IllegalArgumentException("품목코드는 필수 항목입니다.");
        }
        if (checkItemCodeDuplicate(device.getItemCode().trim())) {
            throw new IllegalArgumentException("이미 등록된 품목코드입니다: " + device.getItemCode());
        }

        device.setItemCode(device.getItemCode().trim());
        device.setActive(true);
        device.setDeleted(false);

        MedicalDeviceProduct saved = repository.save(device);

        publishAudit(saved.getId(), "CREATE", username, null, saved, "의료기기 품목 등록: " + saved.getItemCode());
        log.info("[MEDICAL_DEVICE] Created device: id={}, itemCode={}, by={}", saved.getId(), saved.getItemCode(), username);
        return saved;
    }

    /**
     * 의료기기 품목 수정.
     */
    @Transactional
    public MedicalDeviceProduct updateDevice(Long id, MedicalDeviceProduct updated, String username) {
        MedicalDeviceProduct existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 의료기기 품목을 찾을 수 없습니다. (ID: " + id + ")"));

        // 품목코드가 변경되었을 경우 중복 검사
        if (!existing.getItemCode().equalsIgnoreCase(updated.getItemCode().trim())) {
            if (checkItemCodeDuplicate(updated.getItemCode().trim())) {
                throw new IllegalArgumentException("이미 등록된 품목코드입니다: " + updated.getItemCode());
            }
            existing.setItemCode(updated.getItemCode().trim());
        }

        String oldSnapshot = serialize(existing);

        existing.setProductName(updated.getProductName());
        existing.setEnglishProductName(updated.getEnglishProductName());
        existing.setModelName(updated.getModelName());
        existing.setDeviceClassification(updated.getDeviceClassification());
        existing.setIntendedUse(updated.getIntendedUse());
        existing.setLicenseNumber(updated.getLicenseNumber());
        existing.setUdiDi(updated.getUdiDi());
        existing.setUdiPiType(updated.getUdiPiType());
        existing.setSoftware(updated.isSoftware());
        existing.setSoftwareVersion(updated.getSoftwareVersion());
        existing.setSterile(updated.isSterile());
        existing.setSterilizationMethod(updated.getSterilizationMethod());
        existing.setStorageConditions(updated.getStorageConditions());
        existing.setShelfLifeMonths(updated.getShelfLifeMonths());
        existing.setManufacturer(updated.getManufacturer());
        existing.setRemarks(updated.getRemarks());
        existing.setActive(updated.isActive());

        MedicalDeviceProduct saved = repository.save(existing);

        publishAudit(saved.getId(), "UPDATE", username, oldSnapshot, saved, "의료기기 품목 수정: " + saved.getItemCode());
        log.info("[MEDICAL_DEVICE] Updated device: id={}, itemCode={}, by={}", saved.getId(), saved.getItemCode(), username);
        return saved;
    }

    /**
     * 의료기기 품목 삭제 (Soft Delete - Audit Trail 보존).
     */
    @Transactional
    public void deleteDevice(Long id, String username) {
        MedicalDeviceProduct existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 의료기기 품목을 찾을 수 없습니다. (ID: " + id + ")"));

        existing.setDeleted(true);
        existing.setActive(false);
        existing.setDeletedAt(LocalDateTime.now());
        repository.save(existing);

        publishAudit(id, "DELETE", username, existing, null, "의료기기 품목 소프트 삭제: " + existing.getItemCode());
        log.info("[MEDICAL_DEVICE] Soft-deleted device: id={}, itemCode={}, by={}", id, existing.getItemCode(), username);
    }

    /**
     * 대시보드 및 헤더용 요약 통계.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSummaryMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        long total = repository.count();
        metrics.put("totalCount", total);

        List<Object[]> classCounts = repository.countByClassificationGroup();
        Map<String, Long> classMap = new HashMap<>();
        for (Object[] row : classCounts) {
            String classification = (String) row[0];
            Long count = (Long) row[1];
            if (classification != null) {
                classMap.put(classification, count);
            }
        }
        metrics.put("classificationCounts", classMap);

        long udiRegistered = repository.countByUdiDiIsNotNullAndUdiDiNot("");
        metrics.put("udiRegisteredCount", udiRegistered);
        metrics.put("udiRate", total > 0 ? Math.round(((double) udiRegistered / total) * 100.0) : 0);

        return metrics;
    }

    private void publishAudit(Long entityId, String action, String username, Object oldEntity, Object newEntity, String description) {
        User user = null;
        if (username != null) {
            user = userRepository.findByUsername(username).orElse(null);
        }

        EntityChangeEvent event = EntityChangeEvent.builder()
                .entityType("MedicalDeviceProduct")
                .entityId(entityId)
                .action(action)
                .modifier(username)
                .modifierId(user != null ? user.getId() : null)
                .modifierUsername(username)
                .modifierName(user != null ? user.getName() : username)
                .modifierCompany(user != null ? user.getCompanyName() : null)
                .description(description)
                .oldEntity(oldEntity)
                .newEntity(newEntity)
                .build();

        eventPublisher.publishEvent(event);
    }

    private String serialize(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }
}
