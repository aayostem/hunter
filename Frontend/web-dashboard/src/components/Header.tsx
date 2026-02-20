import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  HelpCircle,
  ChevronDown,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Mail,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// Types
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UserMenuOption {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  divider?: boolean;
}

export interface HeaderProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onSearch?: (query: string) => void;
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  onClearNotifications?: () => void;
  userMenuOptions?: UserMenuOption[];
  showSearch?: boolean;
  showNotifications?: boolean;
  showThemeToggle?: boolean;
  showFullscreen?: boolean;
  className?: string;
  testId?: string;
}

// Search result type
interface SearchResult {
  id: number;
  type: string;
  title: string;
  url: string;
}

// Notification icons
const NOTIFICATION_ICONS: Record<NotificationType, React.FC<{ className?: string }>> = {
  success: CheckCircle,
  info: Bell,
  warning: AlertCircle,
  error: AlertCircle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  success: 'text-green-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

const NOTIFICATION_BG_COLORS: Record<NotificationType, string> = {
  success: 'bg-green-50',
  info: 'bg-blue-50',
  warning: 'bg-yellow-50',
  error: 'bg-red-50',
};

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen = false,
  onToggleSidebar,
  onSearch,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  onClearNotifications,
  userMenuOptions = [],
  showSearch = true,
  showNotifications = true,
  showThemeToggle = true,
  showFullscreen = true,
  className = '',
  testId,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotificationsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // In production, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results
      const results: SearchResult[] = [
        { id: 1, type: 'campaign', title: 'Welcome Email Series', url: '/campaigns/1' },
        { id: 2, type: 'contact', title: 'john@example.com', url: '/contacts/1' },
        { id: 3, type: 'template', title: 'Newsletter Template', url: '/templates/3' },
      ].filter(r => r.title.toLowerCase().includes(query.toLowerCase()));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }

    onSearch?.(query);
  }, [onSearch]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    onNotificationClick?.(notification);
    setShowNotificationsMenu(false);
    
    if (notification.link) {
      window.location.href = notification.link;
    }
  }, [onNotificationClick]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Default user menu options
  const defaultUserMenuOptions: UserMenuOption[] = [
    {
      id: 'profile',
      label: 'Your Profile',
      icon: User,
      onClick: () => { window.location.href = '/profile'; },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => { window.location.href = '/settings'; },
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      onClick: () => { window.location.href = '/help'; },
      divider: true,
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: LogOut,
      onClick: logout,
    },
  ];

  const menuOptions = userMenuOptions.length > 0 ? userMenuOptions : defaultUserMenuOptions;

  return (
    <header
      className={`
        bg-white border-b border-gray-200 sticky top-0 z-30
        ${className}
      `}
      data-testid={testId}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <Menu className="h-6 w-6" />
              </button>
            )}

            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
              <Mail className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">EmailSuite</span>
            </div>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="flex-1 max-w-2xl mx-8" ref={searchRef}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search campaigns, contacts, templates..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  aria-label="Search"
                />

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                    {searchResults.map((result) => (
                      <a
                        key={result.id}
                        href={result.url}
                        className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {result.title}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {result.type}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center space-x-3">
            {/* Theme toggle */}
            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Fullscreen toggle */}
            {showFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Notifications */}
            {showNotifications && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                  className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
                  aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotificationsMenu && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && onMarkAllRead && (
                          <button
                            onClick={onMarkAllRead}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </button>
                        )}
                        {onClearNotifications && (
                          <button
                            onClick={onClearNotifications}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const Icon = NOTIFICATION_ICONS[notification.type];
                          const colorClass = NOTIFICATION_COLORS[notification.type];
                          const bgColorClass = NOTIFICATION_BG_COLORS[notification.type];

                          return (
                            <div
                              key={notification.id}
                              className={`
                                p-4 border-b border-gray-100 last:border-0 cursor-pointer
                                hover:bg-gray-50 transition-colors
                                ${!notification.read ? bgColorClass : ''}
                              `}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`flex-shrink-0 ${colorClass}`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatTimestamp(notification.timestamp)}
                                  </p>
                                  {notification.action && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        notification.action?.onClick();
                                      }}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      {notification.action.label}
                                    </button>
                                  )}
                                </div>
                                {!notification.read && (
                                  <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg"
                aria-label="User menu"
              >
                <div className="flex-shrink-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {menuOptions.map((option, index) => (
                      <React.Fragment key={option.id}>
                        {option.divider && index > 0 && (
                          <div className="border-t border-gray-100 my-1" />
                        )}
                        <button
                          onClick={() => {
                            option.onClick();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <option.icon className="h-4 w-4 text-gray-500" />
                          <span>{option.label}</span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};