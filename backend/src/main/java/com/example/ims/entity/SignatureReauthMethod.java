package com.example.ims.entity;

public enum SignatureReauthMethod {
    PASSWORD("비밀번호 2차 재인증 (Password Re-auth)"),
    TWO_FACTOR("2단계 보안 OTP 인증 (2FA OTP)"),
    BIOMETRIC("생체/보안키 인증 (FIDO2/Biometrics)");

    private final String description;

    SignatureReauthMethod(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
