'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, User } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, user, loading } = useAuth();
  const router = useRouter();

  // If already logged in, redirect them away from the login page
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        router.push('/admin');
      } else if (user.role === 'INSTALLER') {
        router.push('/installer');
      } else {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // NOTE: Update this URL to match your backend if deployed elsewhere
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data as User);
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Cannot connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Sign In</h1>
            <p className="text-neutral-500 text-sm mt-1">Access your PPF Cutting Platform</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-500">
            <p>Demo Credentials:</p>
            <p className="mt-1">Admin: admin@ppfcutting.com / adminppf@pass123</p>
            <p>Installer: installer@tndevelopment.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
