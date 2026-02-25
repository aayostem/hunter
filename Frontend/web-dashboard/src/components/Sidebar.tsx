// components/Sidebar.tsx
import React, { useState, useCallback } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  TrendingUp,
  Users,
  Mail,
  FileText,
  BarChart3,
  LayoutDashboard,
  Send,
  Menu
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Types
export interface SidebarSection {
  id: string;
  title: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  href: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  testId?: string;
}

// Quick stats component
const QuickStats: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const stats = [
    { label: 'Open Rate', value: '68%', change: '+5%', icon: TrendingUp },
    { label: 'Click Rate', value: '24%', change: '-2%', icon: Mail },
    { label: 'Bounce Rate', value: '1.2%', change: '-0.3%', icon: BarChart3 },
  ];

  if (collapsed) {
    return (
      <div className="px-2 py-4 border-t border-gray-200">
        {stats.map((stat, index) => (
          <div key={index} className="relative group mb-2">
            <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <stat.icon className="w-5 h-5 text-gray-400" />
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {stat.label}: {stat.value} {stat.change}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Quick Stats
      </h3>
      <div className="space-y-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change.startsWith('+');
          
          return (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{stat.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{stat.value}</span>
                <span
                  className={`text-xs ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Recent activity component
const RecentActivity: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const activities = [
    { id: 1, text: 'Campaign "Welcome" sent', time: '5m ago', icon: Send },
    { id: 2, text: 'New contact added', time: '1h ago', icon: Users },
    { id: 3, text: 'Open rate increased', time: '2h ago', icon: TrendingUp },
  ];

  if (collapsed) {
    return (
      <div className="px-2 py-4 border-t border-gray-200">
        {activities.map((activity) => (
          <div key={activity.id} className="relative group mb-2">
            <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <activity.icon className="w-5 h-5 text-gray-400" />
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {activity.text} - {activity.time}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">{activity.text}</p>
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main sidebar component
export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggle,
  className = '',
  testId,
}) => {
  const { user, logout } = useAuth();
  const [activeItem, setActiveItem] = useState('dashboard');

  // Navigation items
  const navItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { id: 'campaigns', label: 'Campaigns', icon: Mail, href: '/campaigns', badge: 3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { id: 'contacts', label: 'Contacts', icon: Users, href: '/contacts', badge: 1234 },
    { id: 'templates', label: 'Templates', icon: FileText, href: '/templates' },
  ];

  const handleItemClick = useCallback((item: SidebarItem) => {
    setActiveItem(item.id);
    if (item.onClick) {
      item.onClick();
    } else {
      window.location.href = item.href;
    }
  }, []);

  return (
    <aside
      className={`
        ${collapsed ? 'w-20' : 'w-64'}
        bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        flex flex-col h-screen sticky top-0
        ${className}
      `}
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">EmailSuite</span>
          </div>
        )}
        {collapsed && <Mail className="h-6 w-6 text-blue-600 mx-auto" />}
        
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors relative group
                  ${collapsed ? 'justify-center' : 'justify-start'}
                  ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {!collapsed && (
                  <>
                    <span className="ml-3">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                
                {/* Tooltip for collapsed mode */}
                {collapsed && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick stats */}
        <QuickStats collapsed={collapsed} />

        {/* Recent activity */}
        <RecentActivity collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-1">
          {/* Notifications */}
          <button
            className={`
              w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium
              text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Notifications' : undefined}
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {!collapsed && (
              <>
                <span className="ml-3">Notifications</span>
                <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                  3
                </span>
              </>
            )}
          </button>

          {/* Settings */}
          <button
            className={`
              w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium
              text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="w-5 h-5 text-gray-400" />
            {!collapsed && <span className="ml-3">Settings</span>}
          </button>

          {/* Help */}
          <button
            className={`
              w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium
              text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Help' : undefined}
          >
            <HelpCircle className="w-5 h-5 text-gray-400" />
            {!collapsed && <span className="ml-3">Help</span>}
          </button>

          {/* Logout */}
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
      </div>
    </aside>
  );
};

// Compact version for mobile
export const MobileSidebar: React.FC<Omit<SidebarProps, 'collapsed'>> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar
              {...props}
              collapsed={false}
              onToggle={() => setIsOpen(false)}
              className="shadow-xl"
            />
          </div>
        </>
      )}
    </>
  );
};