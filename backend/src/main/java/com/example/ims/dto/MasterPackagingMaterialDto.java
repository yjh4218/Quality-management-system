package com.example.ims.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MasterPackagingMaterialDto {
    private Long id;
    private String bomCode;
    private String componentName;
    private String type;
    private String detailedType;
    private String detailedMaterial;
    private Double weight;
    private Double thickness;
    private String material;
    private String manufacturer;
    private String specification;
    private Boolean isMultiLayer;
    private String imagePath;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
