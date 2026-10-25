package com.example.ims.dto;

import com.example.ims.entity.QualificationStatus;
import com.example.ims.entity.QualificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🏅 직무 자격 부여 및 갱신 요청 DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserQualificationRequest {

    private Long userId;

    @NotBlank(message = "사용자 아이디는 필수입니다.")
    private String username;

    @NotBlank(message = "임직원 성명은 필수입니다.")
    private String employeeName;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    private String department;

    private String position;

    @NotBlank(message = "자격 명칭은 필수입니다.")
    private String qualificationName;

    @NotNull(message = "자격 구분은 필수입니다.")
    private QualificationType qualificationType;

    private QualificationStatus qualificationStatus;

    @NotNull(message = "자격 취득/부여일은 필수입니다.")
    private LocalDate certifiedDate;

    private LocalDate expiryDate;

    private String requiredCourseCode;

    private String certificateNumber;

    private String authorizerName;

    private String remarks;
}
