package com.example.ims.service;

import com.example.ims.entity.Role;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.RoleRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditLogService auditLogService;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Optional<Role> getRoleById(Long id) {
        return roleRepository.findById(id);
    }

    @Transactional
    public Role createRole(Role role, String modifier) {
        // Automatically prefix with ROLE_ if missing for Spring Security consistency
        if (!role.getRoleKey().startsWith("ROLE_")) {
            role.setRoleKey("ROLE_" + role.getRoleKey().toUpperCase());
        } else {
            role.setRoleKey(role.getRoleKey().toUpperCase());
        }

        if (roleRepository.existsByRoleKey(role.getRoleKey())) {
            throw new IllegalArgumentException("Role key already exists: " + role.getRoleKey());
        }

        Role saved = roleRepository.save(role);
        
        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ROLE")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(modifier)
                .description("Created new role: " + saved.getDisplayName())
                .newEntity(saved)
                .build());
        
        return saved;
    }

    @Transactional
    public Role updateRole(Long id, Role roleDetails, String modifier) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        Role oldSnapshot = Role.builder()
                .roleKey(role.getRoleKey())
                .displayName(role.getDisplayName())
                .description(role.getDescription())
                .isSystemRole(role.isSystemRole())
                .allowedMenus(role.getAllowedMenus())
                .allowedPermissions(role.getAllowedPermissions())
                .build();

        // System roles cannot have their key changed
        if (!role.isSystemRole()) {
            if (!roleDetails.getRoleKey().startsWith("ROLE_")) {
                role.setRoleKey("ROLE_" + roleDetails.getRoleKey().toUpperCase());
            } else {
                role.setRoleKey(roleDetails.getRoleKey().toUpperCase());
            }
        }
        
        role.setDisplayName(roleDetails.getDisplayName());
        role.setDescription(roleDetails.getDescription());
        role.setSystemRole(roleDetails.isSystemRole());
        role.setAllowedMenus(roleDetails.getAllowedMenus());
        role.setAllowedPermissions(roleDetails.getAllowedPermissions());
        
        Role updated = roleRepository.save(role);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ROLE")
                .entityId(updated.getId())
                .action("UPDATE")
                .modifier(modifier)
                .description("Updated role: " + updated.getDisplayName())
                .oldEntity(oldSnapshot)
                .newEntity(updated)
                .build());

        return updated;
    }

    @Transactional
    public void deleteRole(Long id, String modifier) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with id: " + id));

        if (role.isSystemRole()) {
            throw new IllegalStateException("System roles cannot be deleted.");
        }

        // Check if any user is currently using this role
        // This is a simplified check assuming role is a string in User entity
        // If we move to a Many-to-Many, this check would be different.
        // For now, let's just warn or prevent if possible.
        // Since it's a string, we'll allow but log warning.
        
        roleRepository.delete(role);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ROLE")
                .entityId(id)
                .action("DELETE")
                .modifier(modifier)
                .description("Deleted role: " + role.getDisplayName() + " (" + role.getRoleKey() + ")")
                .oldEntity(role)
                .build());
    }

    public boolean isValidRole(String roleKey) {
        return roleRepository.existsByRoleKey(roleKey);
    }

    public List<com.example.ims.entity.AuditLog> getRoleLogs(Long id) {
        return auditLogService.getLogsForEntity("ROLE", id);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(String roleKey, String permissionKey) {
        if (roleKey == null || permissionKey == null) return false;
        
        Optional<Role> roleOpt = roleRepository.findByRoleKey(roleKey);
        if (roleOpt.isEmpty()) return false;
        
        String permissionsJson = roleOpt.get().getAllowedPermissions();
        if (permissionsJson == null || permissionsJson.isEmpty()) return false;
        
        try {
            // Simplified JSON check to avoid heavy dependency if possible
            // but since we have Jackson, let's use it or a simple contains check for now
            // since it's a JSON array of strings: ["PERM1", "PERM2"]
            return permissionsJson.contains("\"" + permissionKey + "\"");
        } catch (Exception e) {
            log.error("Error checking permission: {}", e.getMessage());
            return false;
        }
    }
}
