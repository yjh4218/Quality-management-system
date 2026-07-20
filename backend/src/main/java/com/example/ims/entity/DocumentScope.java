package com.example.ims.entity;

/**
 * 필수서류 적용 대상 범위 Enum
 * - PRODUCT: 품목 단위 (isMaster = true인 마스터 품목만)
 * - MANUFACTURER: 제조사 단위
 */
public enum DocumentScope {
    PRODUCT,
    MANUFACTURER
}
