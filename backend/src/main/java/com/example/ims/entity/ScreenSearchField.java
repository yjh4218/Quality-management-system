package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screen_search_field", indexes = {
    @Index(name = "idx_screen_search_field_screen", columnList = "screen_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenSearchField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private DynamicScreen screen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_id", nullable = false)
    private SearchFieldCatalog catalog;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;
}
