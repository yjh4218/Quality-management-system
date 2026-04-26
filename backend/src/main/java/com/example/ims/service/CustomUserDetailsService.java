package com.example.ims.service;

import com.example.ims.entity.Role;
import com.example.ims.entity.User;
import com.example.ims.repository.RoleRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ObjectMapper objectMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        
        // 1. Add Primary Role (e.g. ROLE_ADMIN, ROLE_USER)
        String roleKey = user.getRole();
        if (roleKey != null) {
            log.info("[RBAC] User '{}' has primary role: {}", username, roleKey);
            authorities.add(new SimpleGrantedAuthority(roleKey));
            
            // 2. Add Dynamic Authorities from Role JSON Mapping
            roleRepository.findByRoleKey(roleKey).ifPresentOrElse(roleEntity -> {
                log.info("[RBAC] Found Role entity for '{}'. Parsing dynamic permissions...", roleKey);
                addDynamicAuthorities(authorities, roleEntity);
            }, () -> {
                log.warn("[RBAC] Role entity NOT found for '{}' in database.", roleKey);
            });
        }
        
        log.info("[RBAC] Final Authorities for '{}': {}", username, authorities);

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .accountLocked(user.isLocked())
                .disabled(!user.isEnabled())
                .authorities(authorities)
                .build();
    }

    private void addDynamicAuthorities(List<SimpleGrantedAuthority> authorities, Role role) {
        try {
            // Parse Menus: {"dashboard":["VIEW"],"users":["VIEW","EDIT"]...}
            if (role.getAllowedMenus() != null && !role.getAllowedMenus().isEmpty()) {
                JsonNode menuNodes = objectMapper.readTree(role.getAllowedMenus());
                menuNodes.fields().forEachRemaining(entry -> {
                    String menuKey = entry.getKey().toUpperCase();
                    JsonNode permissions = entry.getValue();
                    if (permissions.isArray()) {
                        permissions.forEach(p -> {
                            String action = p.asText().toUpperCase();
                            String authority = "MENU_" + menuKey + "_" + action;
                            authorities.add(new SimpleGrantedAuthority(authority));
                        });
                    }
                });
            }

            // Parse Permissions: ["PERM1", "PERM2"...]
            if (role.getAllowedPermissions() != null && !role.getAllowedPermissions().isEmpty()) {
                JsonNode permNodes = objectMapper.readTree(role.getAllowedPermissions());
                if (permNodes.isArray()) {
                    permNodes.forEach(p -> {
                        authorities.add(new SimpleGrantedAuthority(p.asText().toUpperCase()));
                    });
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse dynamic authorities for role: {}", role.getRoleKey(), e);
        }
    }
}
