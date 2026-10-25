package com.example.ims.dto;

import com.example.ims.entity.ComplaintActionType;
import com.example.ims.entity.NcrActionStatus;
import com.example.ims.entity.VerificationResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintActionItemRequest {

    @NotNull(message = "조치 유형은 필수입니다.")
    private ComplaintActionType actionType;

    @NotBlank(message = "조치 제목은 필수입니다.")
    private String title;

    @NotBlank(message = "조치 상세 내용은 필수입니다.")
    private String description;

    @NotBlank(message = "담당자 성명은 필수입니다.")
    private String assigneeName;

    private String assigneeDept;

    @NotNull(message = "완료 예정일은 필수입니다.")
    private LocalDate dueDate;

    private LocalDate completedDate;
    private NcrActionStatus status;
    private String actionResult;
    private String verifiedBy;
    private VerificationResult verificationResult;
}
