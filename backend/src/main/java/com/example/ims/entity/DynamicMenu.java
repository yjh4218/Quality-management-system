package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dynamic_menu", indexes = {
    @Index(name = "idx_dyn_menu_code", columnList = "menu_code", unique = true),
    @Index(name = "idx_dyn_menu_parent", columnList = "parent_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicMenu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private DynamicMenu parent;

    @Column(name = "menu_name", nullable = false, length = 100)
    private String menuName;

    @Column(name = "menu_code", unique = true, nullable = false, length = 50)
    private String menuCode;

    @Builder.Default
    @Column(name = "menu_order")
    private Integer menuOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id")
    private DynamicScreen screen;

    @Column(length = 50)
    private String icon;

    @Builder.Default
    @Column(name = "menu_type", length = 20)
    private String menuType = "DYNAMIC";

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
}
