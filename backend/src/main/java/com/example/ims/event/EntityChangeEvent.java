package com.example.ims.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * Event for entity changes (Create, Update, Delete) for audit logging.
 * Decouples services from AuditLogService.
 */
@Getter
@AllArgsConstructor
@Builder
public class EntityChangeEvent {
    private final String entityType;
    private final Long entityId;
    private final String action;
    private final String modifier;
    private final String description;
    private final Object oldEntity;
    private final Object newEntity;
}
