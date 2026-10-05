package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screen_grid_column", indexes = {
    @Index(name = "idx_screen_grid_column_screen", columnList = "screen_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenGridColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private DynamicScreen screen;

    @Column(name = "field_key", nullable = false, length = 50)
    private String fieldKey;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(name = "field_type", nullable = false, length = 20)
    private String fieldType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "relation_source_id")
    private MasterDataSource relationSource;

    private Integer width;

    @Builder.Default
    private Boolean sortable = true;

    @Builder.Default
    private Boolean editable = false;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Builder.Default
    @Column(name = "is_measure")
    private Boolean isMeasure = false;

    @Builder.Default
    @Column(name = "is_dimension")
    private Boolean isDimension = false;

    @Column(name = "aggregation_type", length = 10)
    private String aggregationType;

    @Builder.Default
    @Column(name = "is_primary_date")
    private Boolean isPrimaryDate = false;

    @Builder.Default
    @Column(name = "is_excluded_from_dashboard")
    private Boolean isExcludedFromDashboard = false;
}
