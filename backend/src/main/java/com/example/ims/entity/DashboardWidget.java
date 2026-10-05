package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dashboard_widget", indexes = {
    @Index(name = "idx_dashboard_widget_dashboard", columnList = "dashboard_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardWidget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dashboard_id", nullable = false)
    private DynamicDashboard dashboard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "widget_id", nullable = false)
    private WidgetCatalog widget;

    @Column(name = "bound_field_key", nullable = false, length = 50)
    private String boundFieldKey;

    @Column(name = "secondary_field_key", length = 50)
    private String secondaryFieldKey;

    @Column(length = 100)
    private String title;

    @Builder.Default
    @Column(name = "position_x")
    private Integer positionX = 0;

    @Builder.Default
    @Column(name = "position_y")
    private Integer positionY = 0;

    @Builder.Default
    private Integer width = 4;

    @Builder.Default
    private Integer height = 3;
}
