package com.example.ims.entity;

/**
 * 서류 제출 요구 상태 Enum
 * - PENDING: 요청 전 대기
 * - REQUESTED: 요청 메일 발송됨 (제조사 회신 대기)
 * - FULFILLED: 제조사 업로드 완료 (제출완료)
 * - OVERDUE: 기한 경과 (기한초과)
 */
public enum DocumentStatus {
    PENDING,
    REQUESTED,
    FULFILLED,
    OVERDUE
}
