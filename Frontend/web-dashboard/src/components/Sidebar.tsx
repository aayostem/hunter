import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  FileText, 
  Users, 
  Settings,
  Send,
  Inbox
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/campaigns', icon: Send, label: 'Campaigns' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/templates', icon: FileText, label: 'Templates' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/inbox', icon: Inbox, label: 'Inbox' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          EmailSuite
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm font-medium">Free Plan</p>
          <p className="text-xs opacity-90 mt-1">500 emails remaining</p>
          <button className="mt-3 bg-white text-blue-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
};