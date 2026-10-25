package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TestResultStatus {
    PENDING("실행 대기 (Pending)"),
    PASS("적합 (PASS)"),
    FAIL("부적합 (FAIL)"),
    DEVIATION_ACCEPTED("일탈 수용 (Deviation Accepted)"),
    WAIVED("검증 면제 (Waived)");

    private final String description;
}
