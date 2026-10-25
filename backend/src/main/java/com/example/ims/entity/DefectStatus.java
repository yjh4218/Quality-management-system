package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DefectStatus {
    OPEN("미해결 (Open - 조치 진행 중)"),
    RESOLVED("조치 완료 (Resolved - 재시험 합격)"),
    ACCEPTED_RISK("잔여 리스크 수용 (Accepted Risk - 변경관리/경영승인)");

    private final String description;
}
