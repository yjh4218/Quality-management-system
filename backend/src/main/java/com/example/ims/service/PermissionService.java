package com.example.ims.service;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.entity.Role;
import com.example.ims.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service("perm")
@RequiredArgsConstructor
public class PermissionService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ObjectMapper objectMapper;

    public boolean can(String menuKey, String action) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        
        String username = auth.getName();
        if ("anonymousUser".equals(username)) return false;

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return false;

        // Admin has all permissions
        if (user.getRole() != null && user.getRole().contains("ADMIN")) return true;

        // Check each role's allowedMenus
        // Note: The user entity's 'role' field is a comma-separated string of roleKeys (e.g. "USER,QUALITY_TEAM")
        String[] roleKeys = user.getRole().split(",");
        for (String key : roleKeys) {
            String roleKey = key.trim();
            if (!roleKey.startsWith("ROLE_")) {
                roleKey = "ROLE_" + roleKey;
            }
            
            final String finalRoleKey = roleKey;
            Role role = roleRepository.findByRoleKey(finalRoleKey).orElse(null);
            if (role == null) continue;

            if (checkRolePermission(role, menuKey, action)) return true;
        }

        return false;
    }

    private boolean checkRolePermission(Role role, String menuKey, String action) {
        if (role.getAllowedMenus() == null) return false;
        try {
            String json = role.getAllowedMenus().trim();
            if (json.startsWith("{")) {
                Map<String, List<String>> permissions = objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, List<String>>>() {});
                List<String> actions = permissions.get(menuKey);
                return actions != null && actions.contains(action);
            } else {
                // Legacy CSV support (VIEW only)
                return "VIEW".equals(action) && List.of(json.split(",")).contains(menuKey);
            }
        } catch (Exception e) {
            return false;
        }
    }
}
