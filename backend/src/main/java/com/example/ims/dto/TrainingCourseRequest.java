package com.example.ims.dto;

import com.example.ims.entity.ProductFamily;
import com.example.ims.entity.TrainingCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * 🎓 교육과정 등록 및 수정 요청 DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingCourseRequest {

    @NotBlank(message = "교육과정 코드는 필수입니다.")
    private String courseCode;

    @NotBlank(message = "교육과정 명칭은 필수입니다.")
    private String courseName;

    @NotNull(message = "교육 카테고리는 필수입니다.")
    private TrainingCategory category;

    @NotNull(message = "적용 제품군은 필수입니다.")
    private ProductFamily targetFamily;

    private String targetAudience;

    @NotNull(message = "교육 주기는 필수입니다.")
    private Integer cycleMonths;

    private Integer passingScore;

    private Double trainingHours;

    private Boolean isRequired;

    private String instructor;

    private String description;

    private String materialUrl;

    private String status;
}
