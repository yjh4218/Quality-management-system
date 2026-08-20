package com.example.ims.service;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.entity.Role;
import com.example.ims.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service("perm")
@RequiredArgsConstructor
public class PermissionService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ObjectMapper objectMapper;

    // roleKey + ":" + menuKey + ":" + action 결과를 5분간 캐싱
    private final Cache<String, Boolean> permCache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(5000)
            .build();

    public boolean can(String menuKey, String action) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        
        String username = auth.getName();
        if ("anonymousUser".equals(username)) return false;

        // Admin checks using Authorities exact match
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
        if (isAdmin) return true;

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || user.getRole() == null) return false;

        // Second check for User.role string
        if (user.getRole().equals("ADMIN") || user.getRole().equals("ROLE_ADMIN")) return true;

        String[] roleKeys = user.getRole().split(",");
        for (String key : roleKeys) {
            String roleKey = key.trim();
            if (!roleKey.startsWith("ROLE_")) {
                roleKey = "ROLE_" + roleKey;
            }

            String cacheKey = roleKey + ":" + menuKey + ":" + action;
            Boolean cached = permCache.getIfPresent(cacheKey);
            if (cached != null) {
                if (cached) return true;
                continue;
            }
            
            final String finalRoleKey = roleKey;
            Role role = roleRepository.findByRoleKey(finalRoleKey).orElse(null);
            if (role == null) {
                permCache.put(cacheKey, false);
                continue;
            }

            boolean hasPerm = checkRolePermission(role, menuKey, action);
            permCache.put(cacheKey, hasPerm);
            if (hasPerm) return true;
        }

        return false;
    }

    private boolean checkRolePermission(Role role, String menuKey, String action) {
        if (role.getAllowedMenus() == null) return false;
        try {
            String json = role.getAllowedMenus().trim();
            if (json.startsWith("{")) {
                Map<String, Object> map = objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                Object val = map.get(menuKey);
                if (val instanceof List) {
                    return ((List<?>) val).contains(action);
                }
            } else if (json.contains(menuKey) && "VIEW".equals(action)) {
                return true;
            }
        } catch (Exception e) {
            // Fallback for parsing errors
        }
        return false;
    }
}
