package com.example.ims.config;

/**
 * Standard Role Constants for Role-Based Access Control (RBAC).
 * Centralized to prevent typos and ensure consistency across the system.
 */
public final class RoleConstants {

    private RoleConstants() {
        // Private constructor to prevent instantiation
    }

    public static final String ADMIN = "ROLE_ADMIN";
    public static final String QUALITY_TEAM = "ROLE_QUALITY_TEAM";
    public static final String MANUFACTURER = "ROLE_MANUFACTURER";
    public static final String USER = "ROLE_USER";

    public static final String[] ALL_ROLES = {ADMIN, QUALITY_TEAM, MANUFACTURER, USER};

    /**
     * Helper to check if a role is valid.
     */
    public static boolean isValidRole(String role) {
        if (role == null) return false;
        for (String r : ALL_ROLES) {
            if (r.equals(role)) return true;
        }
        return false;
    }
}
