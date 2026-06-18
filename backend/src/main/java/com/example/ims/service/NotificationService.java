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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

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
        return notificationRepository.save(notification);
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

    private static class UsernameNotFoundException extends RuntimeException {
        public UsernameNotFoundException(String msg) {
            super(msg);
        }
    }
}
