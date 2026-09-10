'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Building, 
  Scissors, 
  Monitor, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
  // { name: 'Users', href: '/admin/users', icon: Users },
  // { name: 'Organizations', href: '/admin/organizations', icon: Building },
  { name: 'Cutting Jobs', href: '/admin/jobs', icon: Scissors },
  { name: 'Plotters', href: '/admin/plotters', icon: Monitor },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
        {/* Sidebar */}
        <aside className="w-64 h-screen sticky top-0 shrink-0 bg-white border-r border-neutral-200 flex flex-col">
          <div className="h-16 shrink-0 flex items-center px-6 border-b border-neutral-200">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              PPF Admin
            </h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-2xs'
                      : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} />
                  <span className="text-sm">{link.name}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-neutral-200 shrink-0">
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
        <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
          <header className="h-16 shrink-0 border-b border-neutral-200 bg-white flex items-center justify-end px-8">
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">
                {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {user ? user.firstName.charAt(0) : 'A'}
              </div>
            </div>
          </header>
          <div className="flex-1 p-8 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
