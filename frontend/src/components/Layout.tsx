import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FilePlus, 
  History, 
  Settings as SettingsIcon, 
  BarChart, 
  DatabaseBackup 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navItems = [
    { to: '/add-transaction', icon: FilePlus, label: 'Add Transaction' },
    { to: '/transactions', icon: History, label: 'Transactions' },
    { to: '/reports', icon: BarChart, label: 'Reports' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
    { to: '/backup', icon: DatabaseBackup, label: 'Backup / Restore' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">FishSys Pro</h1>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          Offline Mode
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
