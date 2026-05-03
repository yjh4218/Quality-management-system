package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String name;

    @Column(name = "company_name")
    private String companyName;

    private String department;

    private String position;

    private String email;

    private String phone;

    // e.g. ROLE_USER, ROLE_ADMIN
    private String role;

    // Admin approval required
    @Column(nullable = false)
    private Boolean enabled;

    @Builder.Default
    private Integer failedAttempts = 0;

    @Builder.Default
    private Boolean locked = false;

    @Builder.Default
    private Boolean passwordResetRequired = false;

    private LocalDateTime lastLogin;

    @Builder.Default
    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "verification_token")
    private String verificationToken;

    // --- Compatibility Getters for Boolean wrappers ---
    public boolean isEnabled() {
        return Boolean.TRUE.equals(enabled);
    }

    public boolean isLocked() {
        return Boolean.TRUE.equals(locked);
    }

    public boolean isEmailVerified() {
        return Boolean.TRUE.equals(emailVerified);
    }
}
