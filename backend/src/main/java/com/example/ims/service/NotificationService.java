package com.example.ims.service;

import com.example.ims.entity.Notification;
import com.example.ims.entity.User;
import com.example.ims.repository.NotificationRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @lombok.Value
    public static class UserSseConnection {
        String username;
        String role;
        String companyName;
        SseEmitter emitter;
    }

    private final List<UserSseConnection> sseConnections = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return null;
        }
        String role = user.getRole() != null ? user.getRole() : "";
        if (!role.isEmpty() && !role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }
        return subscribe(username, role, user.getCompanyName());
    }

    public SseEmitter subscribe(String username, String role, String companyName) {
        // 30 minutes timeout
        SseEmitter emitter = new SseEmitter(1800000L);
        UserSseConnection connection = new UserSseConnection(username, role, companyName, emitter);
        sseConnections.add(connection);

        emitter.onCompletion(() -> sseConnections.remove(connection));
        emitter.onTimeout(() -> {
            sseConnections.remove(connection);
            try {
                emitter.complete();
            } catch (Exception e) {
                // Ignore
            }
        });
        emitter.onError((ex) -> {
            sseConnections.remove(connection);
            try {
                emitter.completeWithError(ex);
            } catch (Exception e) {
                // Ignore
            }
        });

        try {
            // Send initial ping event to establish connection successfully
            emitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (Exception e) {
            sseConnections.remove(connection);
        }

        return emitter;
    }

    /**
     * 알림 등록 (NTF-YYYYMMDD-000 일련번호 규칙 적용)
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Notification createNotification(String title, String message, String type, 
                                           String targetUsername, String targetRole, 
                                           String targetCompanyName, String linkUrl) {
        String dateStr = LocalDate.now().toString().replace("-", "");
        Long seq = notificationRepository.getNextSequence();
        String notifNum = String.format("NTF-%s-%03d", dateStr, seq);

        Notification notification = Notification.builder()
                .notificationNumber(notifNum)
                .title(title)
                .message(message)
                .type(type)
                .targetUsername(targetUsername)
                .targetRole(targetRole)
                .targetCompanyName(targetCompanyName)
                .linkUrl(linkUrl)
                .isRead(false)
                .isDeleted(false)
                .build();

        log.info("[NOTIFICATION] Created notification: {} -> targetUser: {}, targetRole: {}", 
                notifNum, targetUsername, targetRole);
        
        Notification saved = notificationRepository.save(notification);

        // Transaction post-commit sync to send SSE event
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        sendNotificationToSse(saved);
                    }
                }
            );
        } else {
            sendNotificationToSse(saved);
        }

        return saved;
    }

    private void sendNotificationToSse(Notification notification) {
        for (UserSseConnection conn : sseConnections) {
            boolean shouldSend = false;
            
            // Check if notification matches target user constraints
            if (notification.getTargetUsername() != null) {
                if (notification.getTargetUsername().equals(conn.getUsername())) {
                    shouldSend = true;
                }
            } else if (notification.getTargetRole() != null) {
                if (notification.getTargetRole().equals(conn.getRole())) {
                    // Match manufacturer role company boundaries
                    if (notification.getTargetCompanyName() == null || 
                        notification.getTargetCompanyName().equalsIgnoreCase(conn.getCompanyName())) {
                        shouldSend = true;
                    }
                }
            } else if (notification.getTargetCompanyName() != null) {
                if (notification.getTargetCompanyName().equalsIgnoreCase(conn.getCompanyName())) {
                    shouldSend = true;
                }
            }

            if (shouldSend) {
                try {
                    conn.getEmitter().send(SseEmitter.event()
                        .name("notification")
                        .data(notification));
                    log.info("[SSE] Sent notification event to user: {}", conn.getUsername());
                } catch (Exception e) {
                    sseConnections.remove(conn);
                }
            }
        }
    }

    /**
     * 특정 사용자 대상 알림 조회 (Paging/Limit 적용)
     */
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(String username, int limit) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return List.of();
        }

        List<String> roleList = getUserRoles(user);
        Pageable pageable = PageRequest.of(0, limit);

        return notificationRepository.findActiveNotificationsForUser(
                username, roleList, user.getCompanyName(), pageable
        );
    }

    /**
     * 특정 사용자 대상 읽지 않은 알림 수 계산
     */
    @Transactional(readOnly = true)
    public long getUnreadCountForUser(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return 0;
        }

        List<String> roleList = getUserRoles(user);
        return notificationRepository.countUnreadNotificationsForUser(
                username, roleList, user.getCompanyName()
        );
    }

    /**
     * 단일 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(Long id, String username) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + id));

        // 인가 검증: 수신자가 본인인지 혹은 본인의 역할/회사에 속하는지 체크
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        
        boolean isAuthorized = false;
        if (username.equals(notification.getTargetUsername())) {
            isAuthorized = true;
        } else if (notification.getTargetRole() != null) {
            List<String> roleList = getUserRoles(user);
            if (roleList.contains(notification.getTargetRole())) {
                isAuthorized = true;
            }
        } else if (notification.getTargetCompanyName() != null) {
            if (notification.getTargetCompanyName().equals(user.getCompanyName())) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized && !getUserRoles(user).contains("ROLE_ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("알림을 읽을 권한이 없습니다.");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
            log.info("[NOTIFICATION] Marked notification as read: {}", notification.getNotificationNumber());
        }
    }

    /**
     * 사용자의 모든 활성 알림 읽음 처리
     */
    @Transactional
    public void markAllAsRead(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return;
        }

        List<String> roleList = getUserRoles(user);
        List<Notification> unreadList = notificationRepository.findActiveNotificationsForUser(
                username, roleList, user.getCompanyName(), PageRequest.of(0, 1000)
        );

        LocalDateTime now = LocalDateTime.now();
        boolean updated = false;
        for (Notification n : unreadList) {
            if (!n.isRead()) {
                n.setRead(true);
                n.setReadAt(now);
                updated = true;
            }
        }
        if (updated) {
            notificationRepository.saveAll(unreadList);
            log.info("[NOTIFICATION] Marked all notifications as read for user: {}", username);
        }
    }

    /**
     * 알림 Soft Delete
     */
    @Transactional
    public void deleteNotification(Long id, String username) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + id));

        notification.setDeleted(true);
        notificationRepository.save(notification);
        log.info("[NOTIFICATION] Soft deleted notification: {} by {}", notification.getNotificationNumber(), username);
    }

    private List<String> getUserRoles(User user) {
        if (user.getRole() == null) {
            return List.of();
        }
        return Arrays.stream(user.getRole().split(","))
                .map(String::trim)
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .collect(Collectors.toList());
    }

    /**
     * SSE HTTP/2 연결 유지용 하트비트 주기 발송 (20초 주기)
     * Hugging Face, Cloudflare 등 리버스 프록시의 타임아웃 및 net::ERR_HTTP2_PROTOCOL_ERROR 방지
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 20000)
    public void sendHeartbeat() {
        if (sseConnections.isEmpty()) return;
        List<UserSseConnection> deadConnections = new java.util.ArrayList<>();
        for (UserSseConnection conn : sseConnections) {
            try {
                conn.getEmitter().send(SseEmitter.event().name("ping").data("keepalive"));
            } catch (Exception e) {
                deadConnections.add(conn);
            }
        }
        if (!deadConnections.isEmpty()) {
            sseConnections.removeAll(deadConnections);
        }
    }

    private static class UsernameNotFoundException extends RuntimeException {
        public UsernameNotFoundException(String msg) {
            super(msg);
        }
    }
}
