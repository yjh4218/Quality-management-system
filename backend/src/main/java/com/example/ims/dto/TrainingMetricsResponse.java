package com.example.ims.dto;

import lombok.*;

/**
 * 🎓 교육훈련 및 자격관리 대시보드 KPI 지표 응답 DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingMetricsResponse {

    /** 전체 등록 교육과정 수 */
    private long totalCourses;

    /** 운영 중인 활성 교육과정 수 */
    private long activeCourses;

    /** 법정/규제 필수 교육과정 수 */
    private long requiredCourses;

    /** 전체 교육이수 기록 수 */
    private long totalRecords;

    /** 이수 완료(수료) 건수 */
    private long completedRecords;

    /** 수료율 (%) */
    private double completionRate;

    /** 교육 예정/진행 건수 */
    private long scheduledRecords;

    /** 자격/수료 만료 임박(30일 이내) 건수 */
    private long expiringSoonRecords;

    /** 기한 만료 건수 */
    private long expiredRecords;

    /** 총 직무 자격 건수 */
    private long totalQualifications;

    /** 현재 적격(유효) 자격 건수 */
    private long qualifiedUsers;

    /** 30일 이내 자격 만료 임박 건수 */
    private long expiringSoonQualifications;
}
