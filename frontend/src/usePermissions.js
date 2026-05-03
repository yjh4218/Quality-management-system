import { useMemo } from 'react';

/**
 * Hook to manage and check user permissions based on Dynamic RBAC roles.
 * @param {Object} user The user object from App.jsx state
 * @returns {Object} Permission utility functions
 */
export const usePermissions = (user) => {
    
    const isAdmin = useMemo(() => 
        user?.roles?.some(r => r.authority === 'ROLE_ADMIN'), 
    [user]);

    /**
     * core permission check logic
     */
    const hasPermission = (menuKey, action = 'VIEW') => {
        if (isAdmin) return true;
        if (!user || !user.roles) return false;

        return user.roles.some(role => {
            if (!role.allowedMenus) return false;
            try {
                const cleanData = role.allowedMenus.trim();
                if (cleanData.startsWith('{')) {
                    const permissions = JSON.parse(cleanData);
                    return permissions[menuKey]?.includes(action);
                }
                // Legacy CSV support
                return action === 'VIEW' && cleanData.split(',').includes(menuKey);
            } catch (e) {
                return false;
            }
        });
    };

    /**
     * helper for functional permissions (e.g. SENSITIVE_DATA_VIEW)
     */
    const hasFunctionalPermission = (permKey) => {
        if (isAdmin) return true;
        return user?.roles?.some(role => {
            if (!role.allowedPermissions) return false;
            try {
                const perms = JSON.parse(role.allowedPermissions);
                return perms.includes(permKey);
            } catch (e) {
                return false;
            }
        });
    };

    return useMemo(() => ({
        isAdmin,
        canView: (menuKey) => hasPermission(menuKey, 'VIEW'),
        canEdit: (menuKey) => hasPermission(menuKey, 'EDIT'),
        canDelete: (menuKey) => hasPermission(menuKey, 'DELETE'),
        hasPerm: hasFunctionalPermission,
        // Utility for UI
        getAccessProps: (menuKey, action = 'EDIT') => ({
            disabled: !hasPermission(menuKey, action),
            style: !hasPermission(menuKey, action) ? { opacity: 0.5, cursor: 'not-allowed' } : {}
        })
    }), [user, isAdmin]);
};
