package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "master_data_source", indexes = {
    @Index(name = "idx_master_data_source_key", columnList = "source_key", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MasterDataSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_key", unique = true, nullable = false, length = 50)
    private String sourceKey;

    @Column(name = "source_table", nullable = false, length = 100)
    private String sourceTable;

    @Column(name = "value_field", nullable = false, length = 50)
    private String valueField;

    @Column(name = "display_field", nullable = false, length = 50)
    private String displayField;

    @Column(name = "search_api_endpoint", nullable = false, length = 200)
    private String searchApiEndpoint;

    @Column(length = 200)
    private String description;
}
