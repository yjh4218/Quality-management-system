package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentDto {
    private Long id;
    private String companyName;
    private String code;
    private String name;
    private Boolean isActive;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private List<DepartmentRoleDto> roles;
    private String departmentHeadName;
    private Long departmentHeadUserId;
}
