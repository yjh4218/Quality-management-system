package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🔄 변경실행 조치항목 등록/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeActionItemRequest {

    private Integer actionOrder;

    @NotBlank(message = "조치 과제명은 필수입니다.")
    private String actionTitle;

    private String actionDetails;

    @NotBlank(message = "담당자 성명은 필수입니다.")
    private String assignedPerson;

    private String assignedDepartment;

    @NotNull(message = "완료 예정일은 필수입니다.")
    private LocalDate dueDate;

    private LocalDate completionDate;

    @Builder.Default
    private String status = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

    private String evidenceDocUrl;
    private String verificationNotes;
}
