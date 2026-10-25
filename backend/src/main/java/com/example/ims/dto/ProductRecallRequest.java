package com.example.ims.dto;

import com.example.ims.entity.AuthorityType;
import com.example.ims.entity.ProductRegulatoryType;
import com.example.ims.entity.RecallClass;
import com.example.ims.entity.RecallStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRecallRequest {

    @NotBlank(message = "회수 건명/제목은 필수입니다.")
    private String title;

    @NotNull(message = "회수 위해성 등급은 필수입니다.")
    private RecallClass recallClass;

    @NotNull(message = "규제기관은 필수입니다.")
    private AuthorityType authorityType;

    @NotNull(message = "제품 규제 유형은 필수입니다.")
    private ProductRegulatoryType regulatoryType;

    private RecallStatus status;

    @NotBlank(message = "품목코드는 필수입니다.")
    private String itemCode;

    @NotBlank(message = "품목명은 필수입니다.")
    private String productName;

    @NotBlank(message = "대상 LOT 번호는 필수입니다.")
    private String lotNumber;

    private LocalDate distributionStartDate;
    private LocalDate distributionEndDate;

    @NotNull(message = "회수 발의일자는 필수입니다.")
    private LocalDate initiationDate;

    private LocalDate authorityReportDate;
    private String authorityApprovalNumber;

    @NotBlank(message = "회수 사유는 필수입니다.")
    private String recallReason;

    private String healthHazardAssessment;

    @NotNull(message = "출고 총 수량은 필수입니다.")
    private Integer shippedQuantity;

    private Integer recalledQuantity;
    private Integer quarantinedQuantity;
    private Integer disposedQuantity;
    private Integer unretrievedQuantity;

    private String disposalMethod;
    private LocalDate disposalDate;
    private String disposalWitness;

    @NotBlank(message = "회수 책임자는 필수입니다.")
    private String assignedLeader;

    private Long capaId;
    private String capaNumber;
    private String closureSummary;
}
