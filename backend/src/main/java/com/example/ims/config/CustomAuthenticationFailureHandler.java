package com.example.ims.config;

import com.example.ims.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CustomAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final UserRepository userRepository;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        String username = request.getParameter("username");

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

        System.out.println("DEBUG: Login Failure for user: " + username + " - Exception: " + exception.getClass().getSimpleName() + " - Message: " + errorMessage);
        
        response.getWriter().write(errorMessage);
        response.getWriter().flush();
    }
}
