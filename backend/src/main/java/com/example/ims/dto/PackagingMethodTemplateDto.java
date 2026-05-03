package com.example.ims.dto;

import com.example.ims.entity.ProductType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PackagingMethodTemplateDto {
    private Long id;
    private ProductType productType;
    private String methodDescription;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
