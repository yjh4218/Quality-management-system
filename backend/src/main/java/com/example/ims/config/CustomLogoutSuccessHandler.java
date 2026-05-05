package com.example.ims.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CustomLogoutSuccessHandler implements LogoutSuccessHandler {

    private final com.example.ims.service.AccessLogService accessLogService;
    private final com.example.ims.repository.UserRepository userRepository;

    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) 
            throws IOException, ServletException {
        
        if (authentication != null && authentication.getName() != null) {
            String username = authentication.getName();
            String name = userRepository.findByUsername(username)
                    .map(u -> u.getName())
                    .orElse(username);
                    
            accessLogService.log(username, name, "LOGOUT", "/", "로그아웃", request);
        }

        response.setStatus(HttpStatus.OK.value());
        response.getWriter().write("Logout successful");
    }
}
