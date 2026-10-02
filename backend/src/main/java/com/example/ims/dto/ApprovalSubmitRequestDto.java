package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalSubmitRequestDto {
    private String docTypeCode;
    private Long sourceRecordId;
    private String title;
    private Long parentDocumentId;
    private String comment;
    private String content;
    private String retentionPeriod;
    private List<Long> adhocApproverUserIds;
    private List<Long> adhocConsensusUserIds;
    private List<Long> adhocReferenceUserIds;
}
