package com.example.ims.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProductionAuditDTO {
    private Long id;

    @jakarta.validation.constraints.NotBlank(message = "품목 코드는 필수입니다.")
    private String itemCode;

    @jakarta.validation.constraints.NotBlank(message = "제품명은 필수입니다.")
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
