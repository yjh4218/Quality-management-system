package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notification_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", unique = true, nullable = false)
    private String eventType;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "source_domain")
    private String sourceDomain;

    @Column(name = "source_action")
    private String sourceAction;

    @Column(name = "target_roles", length = 500)
    private String targetRoles;
}
