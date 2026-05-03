package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_key", unique = true, nullable = false)
    private String roleKey;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JsonProperty("isSystemRole")
    @Column(name = "is_system_role")
    @Builder.Default
    private boolean isSystemRole = false;

    @Column(name = "allowed_menus", columnDefinition = "TEXT")
    private String allowedMenus;

    @Column(name = "allowed_permissions", columnDefinition = "TEXT")
    private String allowedPermissions;

    @Column(name = "dashboard_layout_id")
    private Long dashboardLayoutId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
