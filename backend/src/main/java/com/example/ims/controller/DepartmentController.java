package com.example.ims.controller;

import com.example.ims.dto.DepartmentDto;
import com.example.ims.dto.DepartmentRoleDto;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
public class DepartmentController {

    private final DepartmentService departmentService;
    private final UserRepository userRepository;

    /**
     * 일반 사용자용 활성 부서 목록 조회 (결재선 지정 및 사용자 소속 표시용)
     */
    @GetMapping("/api/departments")
    public ResponseEntity<List<DepartmentDto>> getActiveDepartments(
            @RequestParam(required = false) String companyName,
            Principal principal) {
        String effectiveCompany = resolveUserCompany(companyName, principal.getName());
        return ResponseEntity.ok(departmentService.getDepartments(effectiveCompany, true));
    }

    /**
     * 결재선 지정용 같은 회사 소속 사용자 검색 (Ad-hoc 결재자/참조자 및 부서원)
     */
    @GetMapping("/api/departments/users")
    public ResponseEntity<List<java.util.Map<String, Object>>> searchCompanyUsers(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) String companyName,
            Principal principal) {
        String effectiveCompany = resolveUserCompany(companyName, principal.getName());
        List<User> users = userRepository.searchActiveCompanyUsers(
                effectiveCompany, keyword, org.springframework.data.domain.PageRequest.of(0, 50));

        List<java.util.Map<String, Object>> result = users.stream().map(u -> java.util.Map.of(
                "id", (Object) u.getId(),
                "username", u.getUsername(),
                "name", u.getName() != null ? u.getName() : "",
                "email", u.getEmail() != null ? u.getEmail() : "",
                "department", u.getDepartment() != null ? u.getDepartment() : "",
                "position", u.getPosition() != null ? u.getPosition() : "",
                "companyName", u.getCompanyName() != null ? u.getCompanyName() : ""
        )).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * 관리자용 부서 목록 조회
     */
    @GetMapping("/api/admin/departments")
    public ResponseEntity<List<DepartmentDto>> getAllDepartments(
            @RequestParam(required = false) String companyName,
            @RequestParam(required = false, defaultValue = "false") Boolean activeOnly,
            Principal principal) {
        String effectiveCompany = resolveUserCompany(companyName, principal.getName());
        return ResponseEntity.ok(departmentService.getDepartments(effectiveCompany, activeOnly));
    }

    /**
     * 부서 단건 조회
     */
    @GetMapping("/api/admin/departments/{id}")
    public ResponseEntity<DepartmentDto> getDepartment(@PathVariable Long id) {
        return ResponseEntity.ok(departmentService.getDepartment(id));
    }

    /**
     * 부서 등록
     */
    @PostMapping("/api/admin/departments")
    public ResponseEntity<DepartmentDto> createDepartment(
            @RequestBody DepartmentDto dto,
            Principal principal) {
        User user = getUser(principal.getName());
        if (!isAdmin(user) && (dto.getCompanyName() == null || !dto.getCompanyName().equalsIgnoreCase(user.getCompanyName()))) {
            dto.setCompanyName(user.getCompanyName());
        }
        return ResponseEntity.ok(departmentService.saveDepartment(dto, principal.getName()));
    }

    /**
     * 부서 수정
     */
    @PutMapping("/api/admin/departments/{id}")
    public ResponseEntity<DepartmentDto> updateDepartment(
            @PathVariable Long id,
            @RequestBody DepartmentDto dto,
            Principal principal) {
        dto.setId(id);
        return ResponseEntity.ok(departmentService.saveDepartment(dto, principal.getName()));
    }

    /**
     * 부서 비활성화
     */
    @DeleteMapping("/api/admin/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable Long id,
            Principal principal) {
        departmentService.deleteDepartment(id, principal.getName());
        return ResponseEntity.ok().build();
    }

    /**
     * 부서 일괄 초기화/생성 (관리자용: 특정 제조원 또는 전체 제조원 대상 표준 6개 부서 생성)
     */
    @PostMapping("/api/admin/departments/batch-init")
    public ResponseEntity<List<DepartmentDto>> initBatchDepartments(
            @RequestParam(required = false) String companyName,
            Principal principal) {
        return ResponseEntity.ok(departmentService.initBatchDepartments(companyName, principal.getName()));
    }

    /**
     * 부서 역할 지정 (부서장/부부서장/팀장 등)
     */
    @PostMapping("/api/admin/departments/{id}/roles")
    public ResponseEntity<DepartmentRoleDto> assignRole(
            @PathVariable Long id,
            @RequestBody DepartmentRoleDto roleDto,
            Principal principal) {
        if (roleDto.getRoleCode() == null || roleDto.getUserId() == null) {
            throw new IllegalArgumentException("역할 코드(roleCode)와 대상 사용자(userId)는 필수입니다.");
        }
        return ResponseEntity.ok(departmentService.assignRole(
                id, roleDto.getRoleCode(), roleDto.getUserId(), principal.getName()));
    }

    /**
     * 부서 역할 해제
     */
    @DeleteMapping("/api/admin/departments/{id}/roles/{roleCode}")
    public ResponseEntity<Void> removeRole(
            @PathVariable Long id,
            @PathVariable String roleCode,
            Principal principal) {
        departmentService.removeRole(id, roleCode, principal.getName());
        return ResponseEntity.ok().build();
    }

    /**
     * 부서 역할 이력 조회
     */
    @GetMapping("/api/admin/departments/{id}/roles")
    public ResponseEntity<List<DepartmentRoleDto>> getRoleHistory(@PathVariable Long id) {
        return ResponseEntity.ok(departmentService.getRoleHistory(id));
    }

    private String resolveUserCompany(String requestedCompany, String username) {
        User user = getUser(username);
        if (isAdmin(user)) {
            return requestedCompany;
        }
        return user.getCompanyName();
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
    }

    private boolean isAdmin(User user) {
        return user.getRole() != null && user.getRole().contains("ADMIN");
    }
}
