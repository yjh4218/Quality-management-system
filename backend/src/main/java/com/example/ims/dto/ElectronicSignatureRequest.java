package com.example.ims.dto;

import com.example.ims.entity.SignatureMeaning;
import com.example.ims.entity.SignatureReauthMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectronicSignatureRequest {

    @NotBlank(message = "대상 문서/모듈 유형은 필수입니다.")
    private String documentType;

    @NotNull(message = "대상 레코드 ID는 필수입니다.")
    private Long targetId;

    private String targetNumber;
    private String targetTitle;

    @NotNull(message = "전자서명 의미/의도는 필수입니다.")
    private SignatureMeaning signatureMeaning;

    private String signatureReason;

    @NotBlank(message = "21 CFR Part 11 재인증을 위한 비밀번호는 필수입니다.")
    private String password;

    @Builder.Default
    private SignatureReauthMethod reauthMethod = SignatureReauthMethod.PASSWORD;
}
