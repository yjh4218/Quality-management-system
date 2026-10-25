package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledDocumentRevisionRequest {

    @NotBlank(message = "신규 개정 번호는 필수입니다 (예: Rev. 1.0).")
    private String revisionNo;

    @NotBlank(message = "개정 사유 및 변경점 요약은 필수 입력값입니다 (규제 추적성 요건).")
    private String changeRationale;

    private String title;

    private String authorName;

    private String reviewerName;

    private String approverName;

    private String department;

    private String content;

    private String attachmentUrl;

    private String attachmentFileName;

    private Long attachmentFileSize;

    private LocalDate effectiveDate;

    private LocalDate expirationDate;
}
