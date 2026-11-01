package com.example.ims.dto;

import com.example.ims.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private String name;
    private String companyName;
    private String department;
    private String position;
    private String phone;
    private String email;
    private String role;
    private boolean enabled;
    private boolean locked;
    private boolean emailVerified;
    private Integer failedAttempts;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;

    public static UserResponseDto fromEntity(User user) {
        if (user == null) return null;
        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .companyName(user.getCompanyName())
                .department(user.getDepartment())
                .position(user.getPosition())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .locked(user.isLocked())
                .emailVerified(user.isEmailVerified())
                .failedAttempts(user.getFailedAttempts())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
