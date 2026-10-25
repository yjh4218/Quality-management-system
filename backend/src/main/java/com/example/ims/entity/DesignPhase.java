package com.example.ims.entity;

/**
 * ISO 13485:2016 §7.3 / 21 CFR 820.30 의료기기 설계개발 6단계 라이프사이클
 */
public enum DesignPhase {
    PLANNING("계획 수립", 1),
    INPUT("설계 입력", 2),
    OUTPUT("설계 출력", 3),
    VERIFICATION("설계 검증", 4),
    VALIDATION("설계 유효성확인", 5),
    TRANSFER("설계 이관", 6),
    COMPLETED("개발 완료/종결", 7);

    private final String description;
    private final int sequence;

    DesignPhase(String description, int sequence) {
        this.description = description;
        this.sequence = sequence;
    }

    public String getDescription() {
        return description;
    }

    public int getSequence() {
        return sequence;
    }
}
