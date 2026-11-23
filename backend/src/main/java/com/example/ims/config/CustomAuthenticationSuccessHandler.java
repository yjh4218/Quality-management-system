package com.example.ims.config;

import com.example.ims.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CustomAuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final com.example.ims.service.AccessLogService accessLogService;
    private final CustomAuthenticationFailureHandler failureHandler;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        String username = authentication.getName();
        String clientIp = getClientIp(request);
        failureHandler.resetFailureCount(clientIp);

        userRepository.findByUsername(username).ifPresent(user -> {
            user.setFailedAttempts(0);
            user.setLastLogin(java.time.LocalDateTime.now()); // Update last login
            userRepository.save(user);
            
            accessLogService.log(username, user.getName(), "LOGIN", "/", "로그인", request);
        });

        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().write("Login successful");
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
