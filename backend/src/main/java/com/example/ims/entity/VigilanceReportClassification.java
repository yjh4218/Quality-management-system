package com.example.ims.entity;

public enum VigilanceReportClassification {
    MFDS_DEATH_LIFE_THREAT_7D("식약처 사망/생명위협 (7일 이내)", 7),
    MFDS_SERIOUS_15D("식약처 기타 중대 부작용 (15일 이내)", 15),
    MFDS_GENERAL_30D("식약처 통상 부작용 (30일 이내)", 30),
    MFDS_COSMETIC_SERIOUS_15D("식약처 화장품 중대 유해사례 (15일 이내)", 15),
    MFDS_COSMETIC_QUARTERLY("식약처 화장품 정기보고 (분기말 익월)", 45),
    FDA_5DAY_MDR("FDA 5-Day MDR (5일 이내)", 5),
    FDA_30DAY_MDR("FDA 30-Day MDR (30일 이내)", 30),
    EU_MDR_IMMEDIATE_2D("EU MDR 공중보건위해 (2일 이내)", 2),
    EU_MDR_SERIOUS_10D("EU MDR 사망/중대악화 (10일 이내)", 10),
    EU_MDR_INCIDENT_15D("EU MDR 중대사고 (15일 이내)", 15);

    private final String description;
    private final int defaultDays;

    VigilanceReportClassification(String description, int defaultDays) {
        this.description = description;
        this.defaultDays = defaultDays;
    }

    public String getDescription() {
        return description;
    }

    public int getDefaultDays() {
        return defaultDays;
    }
}
