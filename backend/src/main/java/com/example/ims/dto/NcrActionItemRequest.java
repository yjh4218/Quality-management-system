package com.example.ims.dto;

import com.example.ims.entity.NcrActionStatus;
import com.example.ims.entity.NcrActionType;
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
public class NcrActionItemRequest {

    private Integer itemOrder;

    @NotNull(message = "조치 유형은 필수입니다.")
    private NcrActionType actionType;

    @NotBlank(message = "조치 과제 내용은 필수입니다.")
    private String description;

    @NotBlank(message = "담당자는 필수입니다.")
    private String assignee;

    private LocalDate dueDate;

    private NcrActionStatus status;

    private VerificationResult verificationResult;

    private String verificationNotes;
}
