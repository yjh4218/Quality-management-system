package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dynamic_menu_permission", uniqueConstraints = {
    @UniqueConstraint(name = "uk_dyn_menu_perm", columnNames = {"menu_id", "role_id"})
}, indexes = {
    @Index(name = "idx_dynamic_menu_perm", columnList = "menu_id, role_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicMenuPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id", nullable = false)
    private DynamicMenu menu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Builder.Default
    @Column(name = "can_view")
    private Boolean canView = true;

    @Builder.Default
    @Column(name = "can_create")
    private Boolean canCreate = false;

    @Builder.Default
    @Column(name = "can_edit")
    private Boolean canEdit = false;

    @Builder.Default
    @Column(name = "can_delete")
    private Boolean canDelete = false;
}
