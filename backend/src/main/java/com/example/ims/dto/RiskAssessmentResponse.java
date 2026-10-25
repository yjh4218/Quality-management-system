package com.example.ims.dto;

import com.example.ims.entity.RiskAssessment;
import com.example.ims.entity.RiskHazardItem;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ⚠️ ISO 14971 위험성 평가 상세/목록 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskAssessmentResponse {

    private Long id;
    private Long version;
    private String assessmentNo;
    private String title;
    private Long productId;
    private String productCode;
    private String productName;
    private String targetFamily;
    private String riskPhase;
    private String versionTag;
    private String status;
    private String author;
    private String reviewer;
    private String approver;
    private LocalDate assessmentDate;
    private LocalDate approvalDate;
    private String scopeDescription;
    private Boolean overallResidualRiskAcceptable;
    private String overallConclusion;

    private int hazardCount;
    private int unacceptableCount;
    private int alarpCount;
    private int acceptableCount;

    private int residualUnacceptableCount;
    private int residualAlarpCount;
    private int residualAcceptableCount;

    private List<RiskHazardItem> hazardItems;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public static RiskAssessmentResponse fromEntity(RiskAssessment entity, boolean includeItems) {
        if (entity == null) return null;

        List<RiskHazardItem> items = entity.getHazardItems();
        int total = items != null ? items.size() : 0;
        int unacc = 0, alarp = 0, acc = 0;
        int resUnacc = 0, resAlarp = 0, resAcc = 0;

        if (items != null) {
            for (RiskHazardItem it : items) {
                if ("UNACCEPTABLE".equals(it.getInitialAcceptability())) unacc++;
                else if ("ALARP".equals(it.getInitialAcceptability())) alarp++;
                else acc++;

                if ("UNACCEPTABLE".equals(it.getResidualAcceptability())) resUnacc++;
                else if ("ALARP".equals(it.getResidualAcceptability())) resAlarp++;
                else resAcc++;
            }
        }

        return RiskAssessmentResponse.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .assessmentNo(entity.getAssessmentNo())
                .title(entity.getTitle())
                .productId(entity.getProductId())
                .productCode(entity.getProductCode())
                .productName(entity.getProductName())
                .targetFamily(entity.getTargetFamily())
                .riskPhase(entity.getRiskPhase())
                .versionTag(entity.getVersionTag())
                .status(entity.getStatus())
                .author(entity.getAuthor())
                .reviewer(entity.getReviewer())
                .approver(entity.getApprover())
                .assessmentDate(entity.getAssessmentDate())
                .approvalDate(entity.getApprovalDate())
                .scopeDescription(entity.getScopeDescription())
                .overallResidualRiskAcceptable(entity.getOverallResidualRiskAcceptable())
                .overallConclusion(entity.getOverallConclusion())
                .hazardCount(total)
                .unacceptableCount(unacc)
                .alarpCount(alarp)
                .acceptableCount(acc)
                .residualUnacceptableCount(resUnacc)
                .residualAlarpCount(resAlarp)
                .residualAcceptableCount(resAcc)
                .hazardItems(includeItems ? items : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
