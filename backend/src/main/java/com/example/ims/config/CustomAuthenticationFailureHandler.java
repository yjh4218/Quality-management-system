package com.example.ims.config;

import com.example.ims.repository.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final UserRepository userRepository;

    // IP별 실패 횟수 트래킹 (15분간 보관)
    private final Cache<String, Integer> ipFailureCache = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(10000)
            .build();

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        String username = request.getParameter("username");
        String clientIp = getClientIp(request);

        // IP 기반 DoS 방어: 동일 IP 10회 실패 시 계정 잠금 대신 IP 블록 429 응답
        Integer ipFailures = ipFailureCache.get(clientIp, k -> 0) + 1;
        ipFailureCache.put(clientIp, ipFailures);

        if (ipFailures > 10) {
            log.warn("IP DoS 감지: IP {}에서 10회 이상 로그인 실패", clientIp);
            response.setStatus(429); // Too Many Requests
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("해당 IP에서 로그인 실패 횟수가 초과되었습니다. 15분 후 다시 시도해 주세요.");
            response.getWriter().flush();
            return;
        }

        userRepository.findByUsername(username).ifPresent(user -> {
            if (user.isEnabled() && !user.isLocked()) {
                user.setFailedAttempts(user.getFailedAttempts() + 1);
                if (user.getFailedAttempts() >= 5) {
                    user.setLocked(true);
                }
                userRepository.save(user);
            }
        });

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("text/plain;charset=UTF-8");
        
        String errorMessage = "아이디 또는 비밀번호가 일치하지 않습니다.";
        if (exception instanceof org.springframework.security.authentication.DisabledException) {
            errorMessage = "비활성화 된 계정으로 관리자에게 문의해주시기 바랍니다.";
        } else if (exception instanceof org.springframework.security.authentication.LockedException) {
            errorMessage = "비밀번호 5회 오류로 인해 계정이 잠겼습니다. 관리자에게 문의해 주시기 바랍니다.";
        } else if (exception.getMessage().contains("User is disabled")) {
            errorMessage = "비활성화 된 계정으로 관리자에게 문의해주시기 바랍니다.";
        } else if (exception.getMessage().contains("User account is locked")) {
            errorMessage = "비밀번호 5회 오류로 인해 계정이 잠겼습니다. 관리자에게 문의해 주시기 바랍니다.";
        }

        log.debug("로그인 실패 - 계정: {}, IP: {}, 예외: {}, 메시지: {}", username, clientIp, exception.getClass().getSimpleName(), errorMessage);
        
        response.getWriter().write(errorMessage);
        response.getWriter().flush();
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
