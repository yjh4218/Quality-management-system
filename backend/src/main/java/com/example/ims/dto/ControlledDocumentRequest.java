package com.example.ims.dto;

import com.example.ims.entity.ControlledDocType;
import com.example.ims.entity.ProductFamily;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledDocumentRequest {

    @NotBlank(message = "문서 번호는 필수 입력값입니다.")
    @Size(max = 50, message = "문서 번호는 최대 50자까지 입력 가능합니다.")
    private String docNo;

    @NotBlank(message = "문서 제목은 필수 입력값입니다.")
    @Size(max = 255, message = "문서 제목은 최대 255자까지 입력 가능합니다.")
    private String title;

    @NotNull(message = "문서 유형을 선택해 주세요.")
    private ControlledDocType docType;

    @Builder.Default
    private ProductFamily targetFamily = ProductFamily.COMMON;

    @Builder.Default
    private String revisionNo = "Rev. 0";

    private String changeRationale;

    private LocalDate effectiveDate;

    private LocalDate expirationDate;

    private String department;

    private String authorName;

    private String reviewerName;

    private String approverName;

    private String content;

    private String attachmentUrl;

    private String attachmentFileName;

    private Long attachmentFileSize;
}
