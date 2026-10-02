package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentRoleDto {
    private Long id;
    private Long departmentId;
    private String departmentName;
    private String companyName;
    private String roleCode;
    private String roleName;
    private Long userId;
    private String username;
    private String userName;
    private String userEmail;
    private Boolean isActive;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
}
