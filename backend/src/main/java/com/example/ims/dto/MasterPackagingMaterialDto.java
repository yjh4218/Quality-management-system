package com.example.ims.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MasterPackagingMaterialDto {
    private Long id;
    private String componentName;
    private String material;
    private String manufacturer;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
