package com.example.ims.service;

import com.example.ims.dto.DepartmentDto;
import com.example.ims.dto.DepartmentRoleDto;
import com.example.ims.entity.Department;
import com.example.ims.entity.DepartmentRole;
import com.example.ims.entity.User;
import com.example.ims.repository.DepartmentRepository;
import com.example.ims.repository.DepartmentRoleRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final DepartmentRoleRepository departmentRoleRepository;
    private final UserRepository userRepository;
    private final com.example.ims.repository.ManufacturerRepository manufacturerRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<DepartmentDto> getDepartments(String companyName, Boolean activeOnly) {
        List<Department> list;
        if (companyName != null && !companyName.isBlank()) {
            list = Boolean.TRUE.equals(activeOnly)
                    ? departmentRepository.findByCompanyNameAndIsActiveTrueOrderByDisplayOrderAsc(companyName)
                    : departmentRepository.findByCompanyNameOrderByDisplayOrderAsc(companyName);
        } else {
            list = departmentRepository.findAll();
        }

        // Batch fetch active roles for all departments to avoid N+1
        List<DepartmentRole> activeRoles = departmentRoleRepository.findAll().stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .collect(Collectors.toList());

        Map<Long, List<DepartmentRole>> rolesByDeptId = activeRoles.stream()
                .collect(Collectors.groupingBy(r -> r.getDepartment().getId()));

        return list.stream().map(dept -> {
            List<DepartmentRole> deptRoles = rolesByDeptId.getOrDefault(dept.getId(), List.of());
            List<DepartmentRoleDto> roleDtos = deptRoles.stream()
                    .map(this::toRoleDto)
                    .collect(Collectors.toList());

            DepartmentRole headRole = deptRoles.stream()
                    .filter(r -> "DEPT_HEAD".equalsIgnoreCase(r.getRoleCode()))
                    .findFirst()
                    .orElse(null);

            return DepartmentDto.builder()
                    .id(dept.getId())
                    .companyName(dept.getCompanyName())
                    .code(dept.getCode())
                    .name(dept.getName())
                    .isActive(dept.getIsActive())
                    .displayOrder(dept.getDisplayOrder())
                    .createdAt(dept.getCreatedAt())
                    .roles(roleDtos)
                    .departmentHeadName(headRole != null && headRole.getUser() != null ? headRole.getUser().getName() : null)
                    .departmentHeadUserId(headRole != null && headRole.getUser() != null ? headRole.getUser().getId() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DepartmentDto getDepartment(Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다. ID: " + id));

        List<DepartmentRole> activeRoles = departmentRoleRepository.findByDepartmentIdAndIsActiveTrue(id);
        List<DepartmentRoleDto> roleDtos = activeRoles.stream().map(this::toRoleDto).collect(Collectors.toList());

        DepartmentRole headRole = activeRoles.stream()
                .filter(r -> "DEPT_HEAD".equalsIgnoreCase(r.getRoleCode()))
                .findFirst()
                .orElse(null);

        return DepartmentDto.builder()
                .id(dept.getId())
                .companyName(dept.getCompanyName())
                .code(dept.getCode())
                .name(dept.getName())
                .isActive(dept.getIsActive())
                .displayOrder(dept.getDisplayOrder())
                .createdAt(dept.getCreatedAt())
                .roles(roleDtos)
                .departmentHeadName(headRole != null && headRole.getUser() != null ? headRole.getUser().getName() : null)
                .departmentHeadUserId(headRole != null && headRole.getUser() != null ? headRole.getUser().getId() : null)
                .build();
    }

    @Transactional
    public DepartmentDto saveDepartment(DepartmentDto dto, String username) {
        boolean isNew = dto.getId() == null;
        Department dept;
        if (isNew) {
            if (departmentRepository.existsByCompanyNameAndCode(dto.getCompanyName(), dto.getCode())) {
                throw new IllegalArgumentException("해당 회사에 이미 존재하는 부서 코드입니다: " + dto.getCode());
            }
            dept = Department.builder()
                    .companyName(dto.getCompanyName())
                    .code(dto.getCode().trim().toUpperCase())
                    .name(dto.getName().trim())
                    .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                    .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                    .build();
        } else {
            dept = departmentRepository.findById(dto.getId())
                    .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다. ID: " + dto.getId()));
            dept.setName(dto.getName().trim());
            if (dto.getIsActive() != null) {
                dept.setIsActive(dto.getIsActive());
            }
            if (dto.getDisplayOrder() != null) {
                dept.setDisplayOrder(dto.getDisplayOrder());
            }
        }

        Department saved = departmentRepository.save(dept);

        auditLogService.logEntityChange("DEPARTMENT", saved.getId(), isNew ? "CREATE" : "UPDATE",
                username, null, username, null, null,
                "부서 " + (isNew ? "신규 등록: " : "수정: ") + saved.getName() + " (" + saved.getCompanyName() + ")",
                null, saved);

        // 부서장(DEPT_HEAD) 지정이 함께 들어온 경우
        if (dto.getDepartmentHeadUserId() != null) {
            assignRole(saved.getId(), "DEPT_HEAD", dto.getDepartmentHeadUserId(), username);
        }

        return getDepartment(saved.getId());
    }

    @Transactional
    public void deleteDepartment(Long id, String username) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다. ID: " + id));
        dept.setIsActive(false);
        departmentRepository.save(dept);

        auditLogService.logEntityChange("DEPARTMENT", id, "DEACTIVATE",
                username, null, username, null, null,
                "부서 비활성화: " + dept.getName() + " (" + dept.getCompanyName() + ")", null, null);
    }

    @Transactional
    public DepartmentRoleDto assignRole(Long departmentId, String roleCode, Long userId, String username) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다. ID: " + departmentId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        // 1. 기존 활성 역할 비활성화 및 종료일시 갱신 (Soft Transition)
        departmentRoleRepository.findByDepartmentIdAndRoleCodeAndIsActiveTrue(departmentId, roleCode)
                .ifPresent(existing -> {
                    existing.setIsActive(false);
                    existing.setEndedAt(LocalDateTime.now());
                    departmentRoleRepository.save(existing);
                });

        // 2. 새 역할 레코드 생성
        DepartmentRole newRole = DepartmentRole.builder()
                .department(dept)
                .roleCode(roleCode)
                .user(user)
                .isActive(true)
                .startedAt(LocalDateTime.now())
                .build();

        DepartmentRole saved = departmentRoleRepository.save(newRole);

        auditLogService.logEntityChange("DEPARTMENT_ROLE", saved.getId(), "ASSIGN_ROLE",
                username, null, username, null, null,
                dept.getName() + " 부서 역할 지정: " + roleCode + " -> " + user.getName(), null, saved);

        return toRoleDto(saved);
    }

    @Transactional
    public void removeRole(Long departmentId, String roleCode, String username) {
        departmentRoleRepository.findByDepartmentIdAndRoleCodeAndIsActiveTrue(departmentId, roleCode)
                .ifPresent(existing -> {
                    existing.setIsActive(false);
                    existing.setEndedAt(LocalDateTime.now());
                    departmentRoleRepository.save(existing);

                    auditLogService.logEntityChange("DEPARTMENT_ROLE", existing.getId(), "REMOVE_ROLE",
                            username, null, username, null, null,
                            existing.getDepartment().getName() + " 부서 역할 해제: " + roleCode + " (이전 담당자: " +
                            (existing.getUser() != null ? existing.getUser().getName() : "") + ")", null, null);
                });
    }

    @Transactional(readOnly = true)
    public List<DepartmentRoleDto> getRoleHistory(Long departmentId) {
        return departmentRoleRepository.findByDepartmentIdOrderByStartedAtDesc(departmentId)
                .stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void seedDefaultDepartments(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return;
        }

        String[][] defaultDepts = {
                {"SALES", "영업팀", "1"},
                {"PROD_MGMT", "생산관리", "2"},
                {"PROD", "생산팀", "3"},
                {"PURCHASE", "구매팀", "4"},
                {"QC", "품질팀", "5"}
        };

        for (String[] deptInfo : defaultDepts) {
            String code = deptInfo[0];
            String name = deptInfo[1];
            int order = Integer.parseInt(deptInfo[2]);

            if (!departmentRepository.existsByCompanyNameAndCode(companyName, code)) {
                Department dept = Department.builder()
                        .companyName(companyName)
                        .code(code)
                        .name(name)
                        .displayOrder(order)
                        .isActive(true)
                        .build();
                departmentRepository.save(dept);
            }
        }
    }

    @Transactional
    public List<DepartmentDto> initBatchDepartments(String companyName, String operator) {
        java.util.Set<String> targetCompanies = new java.util.LinkedHashSet<>();
        if (companyName != null && !companyName.isBlank()) {
            targetCompanies.add(companyName.trim());
        } else {
            List<com.example.ims.entity.Manufacturer> manufacturers = manufacturerRepository.findByActiveTrueAndDeletedFalse();
            for (com.example.ims.entity.Manufacturer m : manufacturers) {
                if (m.getName() != null && !m.getName().isBlank()) {
                    targetCompanies.add(m.getName().trim());
                }
            }
        }

        String[][] defaultDepts = {
            {"SALES", "영업팀", "1"},
            {"PROD_MGMT", "생산관리팀", "2"},
            {"QC", "품질관리(QC)팀", "3"},
            {"PURCHASE", "구매/SCM팀", "4"},
            {"RND", "연구개발(R&D)팀", "5"},
            {"MGMT", "경영지원팀", "6"}
        };

        List<Department> createdDepartments = new ArrayList<>();

        for (String comp : targetCompanies) {
            for (String[] deptInfo : defaultDepts) {
                String code = deptInfo[0];
                String name = deptInfo[1];
                int order = Integer.parseInt(deptInfo[2]);

                if (!departmentRepository.existsByCompanyNameAndCode(comp, code)) {
                    Department newDept = Department.builder()
                            .companyName(comp)
                            .code(code)
                            .name(name)
                            .displayOrder(order)
                            .isActive(true)
                            .createdAt(LocalDateTime.now())
                            .build();
                    createdDepartments.add(newDept);
                }
            }
        }

        if (!createdDepartments.isEmpty()) {
            departmentRepository.saveAll(createdDepartments);
            log.info("[BATCH_INIT_DEPARTMENTS] Operator={}, created {} departments for {} companies",
                    operator, createdDepartments.size(), targetCompanies.size());
        }

        return getDepartments(companyName, false);
    }

    private DepartmentRoleDto toRoleDto(DepartmentRole role) {
        String roleName = switch (role.getRoleCode()) {
            case "DEPT_HEAD" -> "부서장";
            case "DEPUTY_HEAD" -> "부부서장";
            case "TEAM_LEAD" -> "팀장";
            default -> role.getRoleCode();
        };

        return DepartmentRoleDto.builder()
                .id(role.getId())
                .departmentId(role.getDepartment() != null ? role.getDepartment().getId() : null)
                .departmentName(role.getDepartment() != null ? role.getDepartment().getName() : null)
                .companyName(role.getDepartment() != null ? role.getDepartment().getCompanyName() : null)
                .roleCode(role.getRoleCode())
                .roleName(roleName)
                .userId(role.getUser() != null ? role.getUser().getId() : null)
                .username(role.getUser() != null ? role.getUser().getUsername() : null)
                .userName(role.getUser() != null ? role.getUser().getName() : null)
                .userEmail(role.getUser() != null ? role.getUser().getEmail() : null)
                .isActive(role.getIsActive())
                .startedAt(role.getStartedAt())
                .endedAt(role.getEndedAt())
                .createdAt(role.getCreatedAt())
                .build();
    }
}
