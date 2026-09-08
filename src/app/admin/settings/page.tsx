'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Sliders, 
  Save, 
  Check, 
  AlertCircle, 
  User, 
  Lock, 
  FileText, 
  Radio, 
  Layers, 
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

export default function AdminSettingsPage() {
  const { user, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'platform' | 'processing' | 'plotters' | 'profile'>('platform');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Platform Settings
  const [platformName, setPlatformName] = useState('PPF Cutting Platform');
  const [supportEmail, setSupportEmail] = useState('admin@ppfcutting.com');
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // File Processing
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState(50);
  const [defaultDxfUnit, setDefaultDxfUnit] = useState<'mm' | 'in'>('mm');
  const [bezierTolerance, setBezierTolerance] = useState(0.05);
  const [autoConvertDxf, setAutoConvertDxf] = useState(true);

  // Plotter & Network Defaults
  const [defaultPlotterPort, setDefaultPlotterPort] = useState(9100);
  const [heartbeatIntervalSec, setHeartbeatIntervalSec] = useState(60);
  const [logRetentionDays, setLogRetentionDays] = useState(90);

  // Admin Profile Form
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token) return;
      try {
        setIsLoading(true);
        setError('');

        const [settingsRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/settings`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s.platformName) setPlatformName(s.platformName);
          if (s.supportEmail) setSupportEmail(s.supportEmail);
          if (s.allowRegistrations !== undefined) setAllowRegistrations(s.allowRegistrations);
          if (s.maintenanceMode !== undefined) setMaintenanceMode(s.maintenanceMode);
          if (s.maxUploadSizeMB) setMaxUploadSizeMB(s.maxUploadSizeMB);
          if (s.defaultDxfUnit) setDefaultDxfUnit(s.defaultDxfUnit);
          if (s.bezierTolerance) setBezierTolerance(s.bezierTolerance);
          if (s.autoConvertDxf !== undefined) setAutoConvertDxf(s.autoConvertDxf);
          if (s.defaultPlotterPort) setDefaultPlotterPort(s.defaultPlotterPort);
          if (s.heartbeatIntervalSec) setHeartbeatIntervalSec(s.heartbeatIntervalSec);
          if (s.logRetentionDays) setLogRetentionDays(s.logRetentionDays);
        }

        if (profileRes.ok) {
          const p = await profileRes.json();
          setAdminFirstName(p.firstName || '');
          setAdminLastName(p.lastName || '');
          setAdminEmail(p.email || '');
        } else {
          setAdminFirstName(user.firstName || '');
          setAdminLastName(user.lastName || '');
          setAdminEmail(user.email || '');
        }
      } catch (err) {
        setError('Could not load administrative settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setError('');
    setPasswordError('');
    setSaveSuccess(false);

    // Validate password change if provided
    if (newPassword) {
      if (!currentPassword) {
        setPasswordError('Current password is required to change password');
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
    }

    setIsSaving(true);
    try {
      // 1. Save system settings
      const settingsPayload = {
        platformName,
        supportEmail,
        allowRegistrations,
        maintenanceMode,
        maxUploadSizeMB,
        defaultDxfUnit,
        bezierTolerance,
        autoConvertDxf,
        defaultPlotterPort,
        heartbeatIntervalSec,
        logRetentionDays,
      };

      const settingsReq = fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(settingsPayload),
      });

      // 2. Save admin profile
      const profilePayload: any = {
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
      };

      if (newPassword) {
        profilePayload.currentPassword = currentPassword;
        profilePayload.newPassword = newPassword;
      }

      const profileReq = fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const [sRes, pRes] = await Promise.all([settingsReq, profileReq]);

      if (sRes.ok && pRes.ok) {
        const updatedAdmin = await pRes.json();
        login({
          ...user,
          firstName: updatedAdmin.firstName,
          lastName: updatedAdmin.lastName,
          email: updatedAdmin.email,
        });

        setSaveSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errData = !sRes.ok ? await sRes.json() : await pRes.json();
        setError(errData.message || 'Failed to save configuration');
      }
    } catch {
      setError('Cannot connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'platform', label: 'Platform & Access', icon: SettingsIcon },
    { id: 'processing', label: 'Patterns & DXF', icon: FileText },
    { id: 'plotters', label: 'Plotter Fleet', icon: Radio },
    { id: 'profile', label: 'Admin Security', icon: Lock },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Admin Settings</h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              System Control
            </span>
          </div>
          <p className="text-neutral-500 mt-1 text-sm">
            Manage global platform configuration, CAD/DXF parser thresholds, and security credentials.
          </p>
        </div>

        <Button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 rounded-xl shadow-xs self-start sm:self-auto"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Configuration
        </Button>
      </div>

      {/* Maintenance Mode Alert Banner */}
      {maintenanceMode && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">Maintenance Mode is Currently Active</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Installers may see a maintenance notice when submitting new cut jobs.
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm flex items-center gap-3 animate-in fade-in duration-300">
          <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold">Configuration Saved Successfully</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              All platform defaults and credentials have been updated in the database.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-8">
          {/* TAB 1: Platform & Access */}
          {activeTab === 'platform' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Platform Identity</h3>
                  <p className="text-xs text-neutral-500 mt-1">General branding and support information.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Platform Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Admin / Support Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Access & Registration Controls</h3>
                  <p className="text-xs text-neutral-500 mt-1">Manage installer onboarding and server availability.</p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Allow New Installer Registrations</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Permits shops and new installers to create accounts via `/register`.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowRegistrations}
                      onChange={(e) => setAllowRegistrations(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Maintenance Mode</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Restrict non-admin access while performing database migrations or updates.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Patterns & DXF Processing */}
          {activeTab === 'processing' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">CAD / DXF File Parsing</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Control precision and file limits for pattern uploads.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Max Upload Size (MB)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={maxUploadSizeMB}
                        onChange={(e) => setMaxUploadSizeMB(Number(e.target.value))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
                        MB
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Default DXF Unit
                    </label>
                    <select
                      value={defaultDxfUnit}
                      onChange={(e) => setDefaultDxfUnit(e.target.value as any)}
                      className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="mm">Millimeters (mm) — Standard Automotive CAD</option>
                      <option value="in">Inches (in) — Imperial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Curve Spline Tolerance (mm)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.01}
                      max={1.0}
                      value={bezierTolerance}
                      onChange={(e) => setBezierTolerance(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <span className="text-2xs text-neutral-400 mt-1 block">
                      Recommended: 0.05 mm for crisp corner and bumper cuts.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Auto-convert DXF to SVG on Upload</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Automatically produces optimized vector previews for instant browser nesting.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoConvertDxf}
                      onChange={(e) => setAutoConvertDxf(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Plotter Fleet & Network */}
          {activeTab === 'plotters' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Network Cutter Defaults</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Standard communication parameters for Roland, Graphtec, and Mimaki plotters.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Default Raw TCP Port
                    </label>
                    <input
                      type="number"
                      value={defaultPlotterPort}
                      onChange={(e) => setDefaultPlotterPort(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <span className="text-2xs text-neutral-400 mt-1 block">Standard RAW print port: 9100</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Heartbeat Interval (sec)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={heartbeatIntervalSec}
                      onChange={(e) => setHeartbeatIntervalSec(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <span className="text-2xs text-neutral-400 mt-1 block">Plotter liveness check frequency</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Job Log Retention (days)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={logRetentionDays}
                      onChange={(e) => setLogRetentionDays(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <span className="text-2xs text-neutral-400 mt-1 block">Archive finished plotter cut jobs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Admin Profile & Security */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Administrator Profile</h3>
                  <p className="text-xs text-neutral-500 mt-1">Personal administrator credentials and contact.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Change Admin Password</h3>
                  <p className="text-xs text-neutral-500 mt-1">Leave blank if you do not wish to update password.</p>
                </div>

                {passwordError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 h-11 rounded-xl shadow-xs text-sm font-semibold"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
