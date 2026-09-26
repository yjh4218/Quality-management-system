package com.example.ims.service;

import com.example.ims.entity.AccessLog;
import com.example.ims.repository.AccessLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccessLogService {

    private final AccessLogRepository accessLogRepository;

    private final com.example.ims.repository.UserRepository userRepository;

    public void log(String username, String name, String action, String pageUrl, String pageName, HttpServletRequest request) {
        String ipAddress = "127.0.0.1";
        String userAgent = "System";
        try {
            if (request != null) {
                ipAddress = request.getRemoteAddr();
                userAgent = request.getHeader("User-Agent");
            }
        } catch (Exception ignored) {}
        saveLogAsync(username, name, action, pageUrl, pageName, ipAddress, userAgent);
    }

    @org.springframework.scheduling.annotation.Async("auditExecutor")
    @Transactional
    public void saveLogAsync(String username, String name, String action, String pageUrl, String pageName, String ipAddress, String userAgent) {
        String resolvedName = name;
        if (resolvedName == null || resolvedName.equals(username)) {
            try {
                resolvedName = userRepository.findByUsername(username)
                        .map(u -> u.getName())
                        .orElse(username);
            } catch (Exception ignored) {}
        }

        AccessLog log = AccessLog.builder()
                .username(username)
                .name(resolvedName)
                .action(action)
                .pageUrl(pageUrl)
                .pageName(pageName)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .userAgent(userAgent != null ? userAgent : "System")
                .build();

        accessLogRepository.save(log);
    }

    @org.springframework.scheduling.annotation.Async("auditExecutor")
    @Transactional
    public void recordPageView(String username, String pageKey, String pageTitle, java.time.LocalDateTime now) {
        if (username == null || username.trim().isEmpty()) {
            username = "anonymous";
        }
        
        String name = username;
        try {
            var userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent()) {
                name = userOpt.get().getName();
            }
        } catch (Exception e) {
            // ignore
        }

        AccessLog log = AccessLog.builder()
                .username(username)
                .name(name)
                .action("PAGE_VIEW")
                .pageUrl(pageKey)
                .pageName(pageTitle)
                .ipAddress("127.0.0.1")
                .userAgent("Web Client / Single Page App")
                .createdAt(now != null ? now : java.time.LocalDateTime.now())
                .build();

        accessLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AccessLog> getAllLogs() {
        return accessLogRepository.findTop200ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AccessLog> getLogsPaged(org.springframework.data.domain.Pageable pageable) {
        return accessLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
}
