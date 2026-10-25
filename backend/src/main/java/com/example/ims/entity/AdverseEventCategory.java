package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 이상사례 및 부작용 증상 범주
 * 식약처 화장품 안전성 정보 관리 및 의료기기 부작용 보고 기준
 */
@Getter
@RequiredArgsConstructor
public enum AdverseEventCategory {
    // 화장품 이상사례
    SKIN_RASH_ERYTHEMA("피부 발진 / 홍반", ProductRegulatoryType.COSMETIC),
    ACUTE_CONTACT_DERMATITIS("급성 접촉피부염", ProductRegulatoryType.COSMETIC),
    PRURITUS_ITCHING("가려움증 / 소양증", ProductRegulatoryType.COSMETIC),
    ANGIOEDEMA_SWELLING("혈관부종 / 안검 부종", ProductRegulatoryType.COSMETIC),
    BURN_SCALD("작열감 / 피부 열감 / 화상", ProductRegulatoryType.COSMETIC),
    CHEILITIS("구순염 / 입술 균열", ProductRegulatoryType.COSMETIC),
    OCULAR_IRRITATION("안구 자극 / 눈시림 / 결막염", ProductRegulatoryType.COSMETIC),

    // 의료기기 불만 및 이상사례
    LEAKAGE_MALFUNCTION("약액 누출 / 실링 파손", ProductRegulatoryType.MEDICAL_DEVICE),
    CONTAMINATION("이물 혼입 / 미생물 오염", ProductRegulatoryType.MEDICAL_DEVICE),
    MECHANICAL_RESISTANCE("기계적 작동 불량 / 방아쇠 압력", ProductRegulatoryType.MEDICAL_DEVICE),
    BIO_INCOMPATIBILITY("생체 적합성 거부 반응", ProductRegulatoryType.MEDICAL_DEVICE),
    ELECTRICAL_FAILURE("전기적/전자적 오류", ProductRegulatoryType.MEDICAL_DEVICE),

    // 공통 및 기타
    OTHER("기타 이상 증상", ProductRegulatoryType.GENERAL);

    private final String description;
    private final ProductRegulatoryType applicableType;
}
