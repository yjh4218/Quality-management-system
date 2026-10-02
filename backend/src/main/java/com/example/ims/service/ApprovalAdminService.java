package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalAdminService {

    private final ApprovalDocTypeRepository docTypeRepository;
    private final ApprovalTemplateRepository templateRepository;
    private final ApprovalTemplateStepRepository templateStepRepository;
    private final NotificationRuleRepository notificationRuleRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // ═══════════════════════════════════════════
    // 1. Approval Doc Types
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<ApprovalDocTypeDto> getDocTypes(Boolean activeOnly) {
        List<ApprovalDocType> list = Boolean.TRUE.equals(activeOnly)
                ? docTypeRepository.findByIsActiveTrueOrderByNameAsc()
                : docTypeRepository.findAll();

        return list.stream().map(dt -> {
            boolean hasTpl = templateRepository.findByDocTypeIdAndIsCurrentTrue(dt.getId()).isPresent();
            return ApprovalDocTypeDto.builder()
                    .id(dt.getId())
                    .code(dt.getCode())
                    .name(dt.getName())
                    .sourceTable(dt.getSourceTable())
                    .sourceScreen(dt.getSourceScreen())
                    .isActive(dt.getIsActive())
                    .createdAt(dt.getCreatedAt())
                    .hasCurrentTemplate(hasTpl)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ApprovalDocTypeDto getDocType(Long id) {
        ApprovalDocType dt = docTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("문서 유형을 찾을 수 없습니다. ID: " + id));
        boolean hasTpl = templateRepository.findByDocTypeIdAndIsCurrentTrue(dt.getId()).isPresent();
        return ApprovalDocTypeDto.builder()
                .id(dt.getId())
                .code(dt.getCode())
                .name(dt.getName())
                .sourceTable(dt.getSourceTable())
                .sourceScreen(dt.getSourceScreen())
                .isActive(dt.getIsActive())
                .createdAt(dt.getCreatedAt())
                .hasCurrentTemplate(hasTpl)
                .build();
    }

    @Transactional
    public ApprovalDocTypeDto saveDocType(ApprovalDocTypeDto dto, String username) {
        boolean isNew = dto.getId() == null;
        ApprovalDocType dt;
        if (isNew) {
            if (docTypeRepository.existsByCode(dto.getCode())) {
                throw new IllegalArgumentException("이미 존재하는 문서유형 코드입니다: " + dto.getCode());
            }
            dt = ApprovalDocType.builder()
                    .code(dto.getCode().trim().toUpperCase())
                    .name(dto.getName().trim())
                    .sourceTable(dto.getSourceTable().trim())
                    .sourceScreen(dto.getSourceScreen() != null ? dto.getSourceScreen().trim() : null)
                    .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                    .build();
        } else {
            dt = docTypeRepository.findById(dto.getId())
                    .orElseThrow(() -> new IllegalArgumentException("문서 유형을 찾을 수 없습니다. ID: " + dto.getId()));
            dt.setName(dto.getName().trim());
            dt.setSourceTable(dto.getSourceTable().trim());
            dt.setSourceScreen(dto.getSourceScreen() != null ? dto.getSourceScreen().trim() : null);
            if (dto.getIsActive() != null) {
                dt.setIsActive(dto.getIsActive());
            }
        }
        ApprovalDocType saved = docTypeRepository.save(dt);

        auditLogService.logEntityChange("APPROVAL_DOC_TYPE", saved.getId(), isNew ? "CREATE" : "UPDATE",
                username, null, username, null, null,
                "결재 문서유형 " + (isNew ? "신규 등록: " : "수정: ") + saved.getName() + " (" + saved.getCode() + ")",
                null, saved);

        return getDocType(saved.getId());
    }

    // ═══════════════════════════════════════════
    // 2. Approval Templates & Steps
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public ApprovalTemplateDto getCurrentTemplate(String docTypeCode) {
        ApprovalTemplate tpl = templateRepository.findByDocTypeCodeAndIsCurrentTrue(docTypeCode)
                .orElse(null);
        return tpl != null ? toTemplateDto(tpl) : null;
    }

    @Transactional(readOnly = true)
    public ApprovalTemplateDto getCurrentTemplateByDocTypeId(Long docTypeId) {
        ApprovalTemplate tpl = templateRepository.findByDocTypeIdAndIsCurrentTrue(docTypeId)
                .orElse(null);
        return tpl != null ? toTemplateDto(tpl) : null;
    }

    @Transactional(readOnly = true)
    public List<ApprovalTemplateDto> getTemplateHistory(Long docTypeId) {
        return templateRepository.findByDocTypeIdOrderByVersionDesc(docTypeId)
                .stream()
                .map(this::toTemplateDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ApprovalTemplateDto saveTemplate(ApprovalTemplateDto dto, String username) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));

        ApprovalDocType docType = docTypeRepository.findById(dto.getDocTypeId())
                .orElseThrow(() -> new IllegalArgumentException("문서 유형을 찾을 수 없습니다. ID: " + dto.getDocTypeId()));

        // 기존 현재 버전 template들 isCurrent = false 처리
        templateRepository.findByDocTypeIdAndIsCurrentTrue(docType.getId()).ifPresent(existing -> {
            existing.setIsCurrent(false);
            templateRepository.save(existing);
        });

        int nextVersion = templateRepository.findMaxVersionByDocTypeId(docType.getId()) + 1;

        ApprovalTemplate newTemplate = ApprovalTemplate.builder()
                .docType(docType)
                .version(nextVersion)
                .isCurrent(true)
                .createdBy(creator)
                .steps(new ArrayList<>())
                .build();

        if (dto.getSteps() != null && !dto.getSteps().isEmpty()) {
            for (ApprovalTemplateStepDto stepDto : dto.getSteps()) {
                ApprovalTemplateStep step = ApprovalTemplateStep.builder()
                        .template(newTemplate)
                        .stepOrder(stepDto.getStepOrder() != null ? stepDto.getStepOrder() : 1)
                        .stepType(stepDto.getStepType() != null ? stepDto.getStepType() : "APPROVAL")
                        .assigneeType(stepDto.getAssigneeType() != null ? stepDto.getAssigneeType() : "ROLE")
                        .assigneeRole(stepDto.getAssigneeRole())
                        .assigneeDepartmentId(stepDto.getAssigneeDepartmentId())
                        .assigneeUserId(stepDto.getAssigneeUserId())
                        .conditionJson(stepDto.getConditionJson())
                        .isRequired(stepDto.getIsRequired() != null ? stepDto.getIsRequired() : true)
                        .build();
                newTemplate.getSteps().add(step);
            }
        }

        ApprovalTemplate saved = templateRepository.save(newTemplate);

        auditLogService.logEntityChange("APPROVAL_TEMPLATE", saved.getId(), "CREATE_VERSION",
                username, null, username, null, null,
                docType.getName() + " 결재선 템플릿 v" + nextVersion + " 신규 생성 (단계수: " + saved.getSteps().size() + ")",
                null, saved);

        return toTemplateDto(saved);
    }

    // ═══════════════════════════════════════════
    // 3. Notification Rules
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<NotificationRuleDto> getNotificationRules() {
        return notificationRuleRepository.findAll().stream().map(nr -> NotificationRuleDto.builder()
                .id(nr.getId())
                .eventType(nr.getEventType())
                .channel(nr.getChannel())
                .isActive(nr.getIsActive())
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public NotificationRuleDto updateNotificationRule(Long id, Boolean isActive, String username) {
        NotificationRule nr = notificationRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("알림 규칙을 찾을 수 없습니다. ID: " + id));
        nr.setIsActive(isActive);
        NotificationRule saved = notificationRuleRepository.save(nr);

        auditLogService.logEntityChange("NOTIFICATION_RULE", saved.getId(), "UPDATE",
                username, null, username, null, null,
                "결재 알림 규칙 상태 변경: " + saved.getEventType() + " (" + saved.getChannel() + ") -> " + isActive,
                null, saved);

        return NotificationRuleDto.builder()
                .id(saved.getId())
                .eventType(saved.getEventType())
                .channel(saved.getChannel())
                .isActive(saved.getIsActive())
                .build();
    }

    private ApprovalTemplateDto toTemplateDto(ApprovalTemplate tpl) {
        List<ApprovalTemplateStepDto> stepDtos = tpl.getSteps().stream().map(s -> {
            String deptName = null;
            if (s.getAssigneeDepartmentId() != null) {
                deptName = departmentRepository.findById(s.getAssigneeDepartmentId())
                        .map(Department::getName)
                        .orElse(null);
            }

            String userName = null;
            if (s.getAssigneeUserId() != null) {
                userName = userRepository.findById(s.getAssigneeUserId())
                        .map(User::getName)
                        .orElse(null);
            }

            return ApprovalTemplateStepDto.builder()
                    .id(s.getId())
                    .templateId(tpl.getId())
                    .stepOrder(s.getStepOrder())
                    .stepType(s.getStepType())
                    .assigneeType(s.getAssigneeType())
                    .assigneeRole(s.getAssigneeRole())
                    .assigneeDepartmentId(s.getAssigneeDepartmentId())
                    .assigneeDepartmentName(deptName)
                    .assigneeUserId(s.getAssigneeUserId())
                    .assigneeUserName(userName)
                    .conditionJson(s.getConditionJson())
                    .isRequired(s.getIsRequired())
                    .build();
        }).collect(Collectors.toList());

        return ApprovalTemplateDto.builder()
                .id(tpl.getId())
                .docTypeId(tpl.getDocType() != null ? tpl.getDocType().getId() : null)
                .docTypeCode(tpl.getDocType() != null ? tpl.getDocType().getCode() : null)
                .docTypeName(tpl.getDocType() != null ? tpl.getDocType().getName() : null)
                .version(tpl.getVersion())
                .isCurrent(tpl.getIsCurrent())
                .createdById(tpl.getCreatedBy() != null ? tpl.getCreatedBy().getId() : null)
                .createdByName(tpl.getCreatedBy() != null ? tpl.getCreatedBy().getName() : null)
                .createdAt(tpl.getCreatedAt())
                .steps(stepDtos)
                .build();
    }
}
