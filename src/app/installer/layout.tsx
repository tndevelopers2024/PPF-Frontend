'use client';

import Link from 'next/link';
import { 
  Search, 
  Car, 
  History, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const sidebarLinks = [
  { name: 'Vehicle Search', href: '/installer', icon: Search },
  { name: 'My Garage', href: '/installer/garage', icon: Car },
  { name: 'Cut History', href: '/installer/history', icon: History },
  { name: 'Settings', href: '/installer/settings', icon: Settings },
];

export default function InstallerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['INSTALLER', 'SUPER_ADMIN', 'ADMIN']}>
      <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-neutral-200">
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
              PPF Studio
            </h1>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{link.name}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-neutral-200">
            <button 
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-end px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-neutral-600">
                {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
              </span>
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-200">
                {user ? user.firstName.charAt(0) : 'J'}
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
