import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

// export type Permission = string; // Make it a string type

// Or keep the union but add a string index signature
export type Permission = 
  | 'premium'
  | 'admin'
  | 'user'
  | 'manager'
  | 'viewer'
  | (string & {}) // This allows any string while preserving autocomplete
  | 'view_dashboard'
  | 'view_campaigns'
  | 'create_campaign'
  | 'edit_campaign'
  | 'delete_campaign'
  | 'view_analytics'
  | 'export_analytics'
  | 'view_contacts'
  | 'import_contacts'
  | 'export_contacts'
  | 'manage_contacts'
  | 'view_templates'
  | 'create_templates'
  | 'edit_templates'
  | 'delete_templates'
  | 'manage_automation'
  | 'manage_testing'
  | 'view_settings'
  | 'manage_settings'
  | 'manage_team'
  | 'manage_billing'
  | 'manage_api_keys'
  | 'premium'
  | 'enterprise'
  | 'admin';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface UserPermissions {
  roles: Role[];
  permissions: Permission[];
  customPermissions?: Permission[];
}

export interface PermissionsContextType {
  permissions: Permission[];
  roles: Role[];
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (roleName: string) => boolean;
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
}

interface PermissionsProviderProps {
  children: ReactNode;
  initialPermissions?: Permission[];
  initialRoles?: Role[];
}

// Default role definitions based on plan type
const getDefaultRoles = (plan: string): Role[] => {
  const basePermissions: Permission[] = [
    'view_dashboard',
    'view_campaigns',
    'create_campaign',
    'view_analytics',
    'view_contacts',
    'view_templates',
  ];

  const premiumPermissions: Permission[] = [
    ...basePermissions,
    'edit_campaign',
    'export_analytics',
    'import_contacts',
    'create_templates',
    'edit_templates',
    'manage_automation',
    'manage_testing',
    'premium',
  ];

  const enterprisePermissions: Permission[] = [
    ...premiumPermissions,
    'delete_campaign',
    'export_contacts',
    'manage_contacts',
    'delete_templates',
    'manage_settings',
    'manage_team',
    'manage_billing',
    'manage_api_keys',
    'enterprise',
  ];

  const adminPermissions: Permission[] = [
    ...enterprisePermissions,
    'admin',
  ];

  switch (plan) {
    case 'enterprise':
      return [
        { id: 'enterprise', name: 'Enterprise User', permissions: enterprisePermissions },
        { id: 'premium', name: 'Premium User', permissions: premiumPermissions },
        { id: 'basic', name: 'Basic User', permissions: basePermissions },
      ];
    case 'premium':
      return [
        { id: 'premium', name: 'Premium User', permissions: premiumPermissions },
        { id: 'basic', name: 'Basic User', permissions: basePermissions },
      ];
    case 'admin':
      return [
        { id: 'admin', name: 'Administrator', permissions: adminPermissions },
        { id: 'enterprise', name: 'Enterprise User', permissions: enterprisePermissions },
        { id: 'premium', name: 'Premium User', permissions: premiumPermissions },
        { id: 'basic', name: 'Basic User', permissions: basePermissions },
      ];
    default:
      return [{ id: 'basic', name: 'Basic User', permissions: basePermissions }];
  }
};

// Create context
const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// Permissions provider component
export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({
  children,
  initialPermissions = [],
  initialRoles = [],
}) => {
  const { user } = useAuth();
  
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load permissions based on user plan
  useEffect(() => {
    if (user) {
      loadPermissionsForUser(user.plan);
    }
  }, [user]);

  // Load permissions for user based on plan
  const loadPermissionsForUser = async (plan: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be an API call to get user permissions
      await new Promise(resolve => setTimeout(resolve, 500));

      const defaultRoles = getDefaultRoles(plan);
      
      // Flatten permissions from all roles
      const userPermissions = defaultRoles.reduce<Permission[]>((acc, role) => {
        return [...acc, ...role.permissions];
      }, []);

      // Remove duplicates
      const uniquePermissions = [...new Set(userPermissions)];

      setRoles(defaultRoles);
      setPermissions(uniquePermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      console.error('Error loading permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: Permission | Permission[]): boolean => {
    if (Array.isArray(permission)) {
      return permission.every(p => permissions.includes(p));
    }
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((perms: Permission[]): boolean => {
    return perms.some(permission => permissions.includes(permission));
  }, [permissions]);

  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((perms: Permission[]): boolean => {
    return perms.every(permission => permissions.includes(permission));
  }, [permissions]);

  // Check if user has a specific role
  const hasRole = useCallback((roleName: string): boolean => {
    return roles.some(role => role.name.toLowerCase() === roleName.toLowerCase());
  }, [roles]);

  // Refresh permissions from server
  const refreshPermissions = useCallback(async () => {
    if (user) {
      await loadPermissionsForUser(user.plan);
    }
  }, [user]);

  const value = useMemo<PermissionsContextType>(() => ({
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isLoading,
    error,
    refreshPermissions,
  }), [
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isLoading,
    error,
    refreshPermissions,
  ]);

  return React.createElement(
    PermissionsContext.Provider,
    { value },
    children
  );
};

// Hook to use permissions context
export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// Higher-order component to protect routes/components with permissions
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: Permission | Permission[],
  FallbackComponent?: React.ComponentType<P>
): React.FC<P> => {
  const WithPermissionsComponent = (props: P) => {
    const { hasPermission, isLoading } = usePermissions();

    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'flex items-center justify-center h-32' },
        React.createElement('div', { 
          className: 'animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent' 
        })
      );
    }

    const hasAccess = Array.isArray(requiredPermissions)
      ? hasPermission(requiredPermissions)
      : hasPermission(requiredPermissions);

    if (!hasAccess) {
      if (FallbackComponent) {
        return React.createElement(FallbackComponent, props);
      }
      
      return React.createElement(
        'div',
        { className: 'flex flex-col items-center justify-center h-64 text-center' },
        React.createElement(
          'div',
          { className: 'w-16 h-16 mb-4 text-gray-400' },
          React.createElement(
            'svg',
            {
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              xmlns: 'http://www.w3.org/2000/svg',
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 1.5,
              d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            })
          )
        ),
        React.createElement(
          'h3',
          { className: 'text-lg font-medium text-gray-900 mb-2' },
          'Access Denied'
        ),
        React.createElement(
          'p',
          { className: 'text-sm text-gray-500 max-w-md' },
          "You don't have permission to access this page. Please contact your administrator if you believe this is a mistake."
        )
      );
    }

    return React.createElement(Component, props);
  };

  WithPermissionsComponent.displayName = `WithPermissions(${Component.displayName || Component.name || 'Component'})`;
  
  return WithPermissionsComponent;
};

// Permission check component for conditional rendering
export interface PermissionCheckProps {
  children: ReactNode;
  permissions: Permission | Permission[];
  fallback?: ReactNode;
  mode?: 'all' | 'any';
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({
  children,
  permissions,
  fallback = null,
  mode = 'all',
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = useMemo(() => {
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    
    if (mode === 'all') {
      return hasAllPermissions(perms);
    }
    return hasAnyPermission(perms);
  }, [permissions, mode, hasAllPermissions, hasAnyPermission]);

  if (!hasAccess) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
};

// Export permission constants for easy access
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: 'view_dashboard' as Permission,
  },
  CAMPAIGNS: {
    VIEW: 'view_campaigns' as Permission,
    CREATE: 'create_campaign' as Permission,
    EDIT: 'edit_campaign' as Permission,
    DELETE: 'delete_campaign' as Permission,
  },
  ANALYTICS: {
    VIEW: 'view_analytics' as Permission,
    EXPORT: 'export_analytics' as Permission,
  },
  CONTACTS: {
    VIEW: 'view_contacts' as Permission,
    IMPORT: 'import_contacts' as Permission,
    EXPORT: 'export_contacts' as Permission,
    MANAGE: 'manage_contacts' as Permission,
  },
  TEMPLATES: {
    VIEW: 'view_templates' as Permission,
    CREATE: 'create_templates' as Permission,
    EDIT: 'edit_templates' as Permission,
    DELETE: 'delete_templates' as Permission,
  },
  AUTOMATION: {
    MANAGE: 'manage_automation' as Permission,
  },
  TESTING: {
    MANAGE: 'manage_testing' as Permission,
  },
  SETTINGS: {
    VIEW: 'view_settings' as Permission,
    MANAGE: 'manage_settings' as Permission,
    TEAM: 'manage_team' as Permission,
    BILLING: 'manage_billing' as Permission,
    API_KEYS: 'manage_api_keys' as Permission,
  },
  PREMIUM: {
    ACCESS: 'premium' as Permission,
  },
  ENTERPRISE: {
    ACCESS: 'enterprise' as Permission,
  },
  ADMIN: {
    ACCESS: 'admin' as Permission,
  },
} as const;