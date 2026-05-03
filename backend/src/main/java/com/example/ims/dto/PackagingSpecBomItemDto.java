package com.example.ims.dto;

import lombok.Data;

@Data
public class PackagingSpecBomItemDto {
    private Long id;
    private Long masterMaterialId;
    private String componentName; // From master
    private String material; // From master
    private String manufacturer; // From master
    private String specification; // Instance field
    private Double usageCount; // Instance field
    private Integer sortOrder;
}
