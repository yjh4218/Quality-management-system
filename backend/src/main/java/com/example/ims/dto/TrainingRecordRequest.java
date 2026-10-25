package com.example.ims.dto;

import com.example.ims.entity.EffectivenessEvaluation;
import com.example.ims.entity.EvaluationMethod;
import com.example.ims.entity.TrainingCompletionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🎓 교육이수 기록 등록 및 평가 갱신 요청 DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingRecordRequest {

    private String recordNo;

    @NotNull(message = "교육과정 ID는 필수입니다.")
    private Long courseId;

    private Long userId;

    @NotBlank(message = "교육 대상자 아이디는 필수입니다.")
    private String username;

    @NotBlank(message = "교육 대상자 성명은 필수입니다.")
    private String traineeName;

    private String department;

    private String position;

    @NotNull(message = "교육 이수 일자는 필수입니다.")
    private LocalDate trainingDate;

    private LocalDate expiryDate;

    private TrainingCompletionStatus completionStatus;

    private Integer score;

    private Boolean isPassed;

    private EvaluationMethod evaluationMethod;

    private EffectivenessEvaluation effectivenessEvaluation;

    private String effectivenessEvaluator;

    private LocalDate effectivenessDate;

    private String effectivenessNotes;

    private String certificateUrl;

    private String certificateFileName;

    private Long certificateFileSize;

    private String remarks;
}
