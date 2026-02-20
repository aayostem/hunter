import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  Users,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Tag,
  Inbox,
  Send,
  Archive,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS, type Permission } from '../constants/permissions';

// Types
export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  badge?: number;
  children?: NavItem[];
  permissions?: Permission[];
  exact?: boolean;
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
  permissions?: Permission[];
}

export interface NavigationProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  mobile?: boolean;
  onMobileClose?: () => void;
  className?: string;
  testId?: string;
}

// Navigation configuration
const NAVIGATION_SECTIONS: NavSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
        exact: true,
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        icon: Mail,
        path: '/campaigns',
        badge: 3,
        children: [
          {
            id: 'all-campaigns',
            label: 'All Campaigns',
            icon: Inbox,
            path: '/campaigns',
          },
          {
            id: 'active',
            label: 'Active',
            icon: Send,
            path: '/campaigns?status=active',
          },
          {
            id: 'drafts',
            label: 'Drafts',
            icon: Mail,
            path: '/campaigns?status=draft',
            badge: 2,
          },
          {
            id: 'archived',
            label: 'Archived',
            icon: Archive,
            path: '/campaigns?status=archived',
          },
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        path: '/analytics',
      },
      {
        id: 'contacts',
        label: 'Contacts',
        icon: Users,
        path: '/contacts',
        badge: 1234,
        children: [
          {
            id: 'all-contacts',
            label: 'All Contacts',
            icon: Users,
            path: '/contacts',
          },
          {
            id: 'segments',
            label: 'Segments',
            icon: Tag,
            path: '/contacts/segments',
          },
          {
            id: 'lists',
            label: 'Lists',
            icon: Inbox,
            path: '/contacts/lists',
          },
        ],
      },
      {
        id: 'templates',
        label: 'Templates',
        icon: FileText,
        path: '/templates',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    items: [
      {
        id: 'automation',
        label: 'Automation',
        icon: Clock,
        path: '/automation',
        permissions: [PERMISSIONS.PREMIUM],
      },
      {
        id: 'testing',
        label: 'A/B Testing',
        icon: BarChart3,
        path: '/testing',
        permissions: [PERMISSIONS.PREMIUM],
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
      },
      {
        id: 'help',
        label: 'Help & Support',
        icon: HelpCircle,
        path: '/help',
      },
    ],
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  collapsed: controlledCollapsed,
  onToggle,
  mobile = false,
  onMobileClose,
  className = '',
  testId,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const location = useLocation();
  const { logout } = useAuth();
  const { hasPermission } = usePermissions();

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  // Auto-expand parent of current route
useEffect(() => {
  const currentPath = location.pathname;
  const newExpanded = new Set(expandedItems);

  NAVIGATION_SECTIONS.forEach(section => {
    section.items.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          currentPath.startsWith(child.path.split('?')[0])
        );
        if (hasActiveChild) {
          newExpanded.add(item.id);
        }
      }
    });
  });

  setExpandedItems(newExpanded);
}, [location.pathname, expandedItems]); // Add expandedItems to dependencies

  // Toggle collapsed state
  const handleToggle = useCallback(() => {
    const newCollapsed = !collapsed;
    if (onToggle) {
      onToggle(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  }, [collapsed, onToggle]);

  // Toggle expanded item
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Filter items by permissions
  const filterByPermissions = useCallback((items: NavItem[]): NavItem[] => {
    // Define the recursive function inside
    const filterRecursive = (navItems: NavItem[]): NavItem[] => {
      return navItems.reduce<NavItem[]>((acc, item) => {
        // Check permissions for current item
        if (item.permissions && item.permissions.length > 0) {
          // Check if user has ALL required permissions
          const hasAllPermissions = item.permissions.every(permission => {
            return hasPermission(permission);
          });
          
          if (!hasAllPermissions) {
            return acc;
          }
        }

        // Create a copy of the item
        const filteredItem: NavItem = { ...item };

        // Recursively filter children if they exist
        if (item.children) {
          const filteredChildren = filterRecursive(item.children);
          if (filteredChildren.length > 0) {
            filteredItem.children = filteredChildren;
            acc.push(filteredItem);
          }
        } else {
          // Item has no children, include it
          acc.push(filteredItem);
        }

        return acc;
      }, []);
    };

    return filterRecursive(items);
  }, [hasPermission]);

  // Define renderNavItem function for recursive rendering
  const renderNavItem = useCallback(function renderNavItemFn(item: NavItem, depth: number = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = location.pathname === item.path || 
      (item.exact ? false : location.pathname.startsWith(item.path));

    const paddingLeft = collapsed ? 0 : depth * 12;

    return (
      <div key={item.id} className="relative">
        {/* Main item */}
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg
              text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            style={{ paddingLeft: collapsed ? 12 : 12 + paddingLeft }}
            title={collapsed ? item.label : undefined}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center space-x-2">
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </div>
            )}
          </button>
        ) : (
          <NavLink
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            style={{ paddingLeft: collapsed ? 12 : 12 + paddingLeft }}
            title={collapsed ? item.label : undefined}
            onClick={mobile ? onMobileClose : undefined}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
            </div>
          </NavLink>
        )}

        {/* Children */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItemFn(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [collapsed, expandedItems, location.pathname, toggleExpanded, mobile, onMobileClose]);

  // Memoize filtered sections
  const filteredSections = useMemo(() => {
    return NAVIGATION_SECTIONS.map(section => ({
      ...section,
      items: filterByPermissions(section.items),
    })).filter(section => section.items.length > 0);
  }, [filterByPermissions]);

  return (
    <>
      {/* Mobile overlay */}
      {mobile && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Navigation */}
      <nav
        className={`
          ${mobile ? 'fixed inset-y-0 left-0 z-50 w-64' : ''}
          ${collapsed && !mobile ? 'w-20' : 'w-64'}
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          flex flex-col
          ${className}
        `}
        data-testid={testId}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900">EmailSuite</span>
          )}
          {mobile ? (
            <button
              onClick={onMobileClose}
              className="p-2 hover:bg-gray-100 rounded-lg ml-auto"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          ) : (
            <button
              onClick={handleToggle}
              className="p-2 hover:bg-gray-100 rounded-lg ml-auto"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              )}
            </button>
          )}
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          {filteredSections.map(section => (
            <div key={section.id} className="mb-6">
              {section.title && !collapsed && (
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map(item => renderNavItem(item))}
              </div>
            </div>
          ))}
        </div>

        {/* User section */}
        {!mobile && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className={`
                w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium
                text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 text-gray-400" />
              {!collapsed && <span className="ml-3">Sign Out</span>}
            </button>
          </div>
        )}
      </nav>
    </>
  );
};