package com.example.ims.entity;

/**
 * 품질 관리 클레임의 상태 단계를 정의하는 Enum.
 * 하드코딩된 문자열을 대체하여 Type-safe한 상태 관리를 지원합니다.
 */
public enum ClaimStatus {
    RECEIPT("0. 접수"),
    CLAIM_RECEIPT("1. 클레임 접수"),
    ROOT_CAUSE("2. 원인분석/개선방안"),
    PREVENTATIVE("3. 재발방지 수립/적용"),
    TERMINATED("4. 클레임 종결");

    private final String value;

    ClaimStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return this.value;
    }

    public static ClaimStatus fromValue(String value) {
        for (ClaimStatus status : ClaimStatus.values()) {
            if (status.getValue().equals(value)) {
                return status;
            }
        }
        return RECEIPT; // 기본값
    }
}
