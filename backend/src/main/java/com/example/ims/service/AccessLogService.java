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

    @Transactional
    public void log(String username, String name, String action, String pageUrl, String pageName, HttpServletRequest request) {
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        AccessLog log = AccessLog.builder()
                .username(username)
                .name(name)
                .action(action)
                .pageUrl(pageUrl)
                .pageName(pageName)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        accessLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AccessLog> getAllLogs() {
        return accessLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
