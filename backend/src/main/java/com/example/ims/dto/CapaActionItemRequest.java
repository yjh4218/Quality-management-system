package com.example.ims.dto;

import com.example.ims.entity.CapaActionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaActionItemRequest {

    @NotNull(message = "조치 유형은 필수입니다.")
    private CapaActionType actionType;

    @NotBlank(message = "조치과제 제목은 필수입니다.")
    private String title;

    @NotBlank(message = "상세 실행 내용은 필수입니다.")
    private String description;

    @NotBlank(message = "실행 담당자는 필수입니다.")
    private String assignedTo;

    @NotNull(message = "목표 완료일은 필수입니다.")
    private LocalDate targetDate;

    private String status; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    private LocalDate completionDate;
    private String completionNotes;
}
