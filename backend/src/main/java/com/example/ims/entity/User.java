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
    private boolean enabled;

    @Builder.Default
    private Integer failedAttempts = 0;

    @Builder.Default
    private boolean locked = false;

    @Builder.Default
    private Boolean passwordResetRequired = false;

    private LocalDateTime lastLogin;
}
