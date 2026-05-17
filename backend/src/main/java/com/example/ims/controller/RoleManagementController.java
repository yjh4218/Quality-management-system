package com.example.ims.controller;

import com.example.ims.entity.Role;
import com.example.ims.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class RoleManagementController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("@perm.can('roles', 'VIEW')")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @PostMapping
    @PreAuthorize("@perm.can('roles', 'EDIT')")
    public ResponseEntity<Role> createRole(@RequestBody Role role, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roleService.createRole(role, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('roles', 'EDIT')")
    public ResponseEntity<Role> updateRole(@PathVariable Long id, @RequestBody Role role, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roleService.updateRole(id, role, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('roles', 'EDIT')")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        roleService.deleteRole(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/logs")
    @PreAuthorize("@perm.can('roles', 'VIEW')")
    public ResponseEntity<List<com.example.ims.entity.AuditLog>> getRoleLogs(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.getRoleLogs(id));
    }
}
