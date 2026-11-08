package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BugReportSubmitRequest {

    private String reporterUsername;
    private String reporterName;

    @Size(max = 1000, message = "화면명은 최대 1000자까지 입력 가능합니다.")
    private String screenName;

    @Size(max = 1000, message = "URL은 최대 1000자까지 입력 가능합니다.")
    private String url;

    private String steps;

    @Size(max = 5000, message = "설명은 최대 5000자까지 입력 가능합니다.")
    private String description;

    private String serverError;
    private String severity;
    private String errorCategory; // NETWORK, RUNTIME, PROMISE, API_500, RENDER, UNKNOWN
}
