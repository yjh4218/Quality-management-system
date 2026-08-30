package com.example.ims.controller;

import com.example.ims.dto.ApiResponse;
import com.example.ims.entity.Notification;
import com.example.ims.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * QMS 통합 알림(Notification) REST 컨트롤러.
 * 모든 사용자가 본인의 알림에 대한 조회 및 읽음 처리를 수행할 수 있도록 설정합니다.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 알림 실시간 수신용 SSE 스트림 구독 엔드포인트
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeNotifications(@AuthenticationPrincipal UserDetails userDetails, jakarta.servlet.http.HttpServletResponse response) {
        if (userDetails == null) {
            return null;
        }
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("Connection", "keep-alive");
        return notificationService.subscribe(userDetails.getUsername());
    }

    /**
     * 현재 로그인 사용자의 최근 알림 목록 조회 (최대 30개)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        List<Notification> list = notificationService.getNotificationsForUser(userDetails.getUsername(), 30);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * 현재 로그인 사용자의 미읽음 알림 개수 조회
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", 0L)));
        }
        long count = notificationService.getUnreadCountForUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    /**
     * 알림 단건 읽음 처리
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> readNotification(@PathVariable Long id, 
                                                               @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.badRequest().build();
        }
        notificationService.markAsRead(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 사용자의 모든 알림 일괄 읽음 처리
     */
    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> readAllNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.badRequest().build();
        }
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 알림 삭제 (Soft Delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id,
                                                                 @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.badRequest().build();
        }
        notificationService.deleteNotification(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
