package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "manufacturer_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManufacturerFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filePath;
    private String fileName;

    // Category: BIZ_REG, BIZ_LICENSE, INSURANCE, FACTORY_REG, OTHER
    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("manufacturer-files")
    private Manufacturer manufacturer;
}
