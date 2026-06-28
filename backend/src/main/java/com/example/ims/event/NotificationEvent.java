package com.example.ims.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * QMS 공통 알림 발송용 비동기 이벤트 정의
 */
@Getter
@AllArgsConstructor
@Builder
public class NotificationEvent {
    private final String eventType;
    private final String sourceDomain;
    private final String sourceAction;
    private final String title;
    private final String message;
    private final String category;
    private final String companyName;
    private final String linkUrl;
}
