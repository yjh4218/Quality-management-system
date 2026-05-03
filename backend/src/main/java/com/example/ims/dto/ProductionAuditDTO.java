package com.example.ims.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProductionAuditDTO {
    private Long id;
    private String itemCode;
    private String productName;
    private String manufacturerName;
    private LocalDate productionDate;
    private LocalDateTime uploadDate;
    private String containerImages;
    private String boxImages;
    private String loadImages;
    private String status;
    private String rejectionReason;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isDisclosed")
    private boolean isDisclosed;
}
