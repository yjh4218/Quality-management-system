package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "search_field_catalog", indexes = {
    @Index(name = "idx_search_catalog_key", columnList = "catalog_key", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchFieldCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "catalog_key", unique = true, nullable = false, length = 50)
    private String catalogKey;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(name = "field_type", nullable = false, length = 20)
    private String fieldType;

    @Column(name = "component_key", nullable = false, length = 50)
    private String componentKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "relation_source_id")
    private MasterDataSource relationSource;
}
