'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Printer, 
  Sliders, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  Lock, 
  Radio, 
  Layers, 
  Cpu,
  Bell,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { API_URL } from '@/lib/api';

interface Plotter {
  _id: string;
  name: string;
  model: string;
  status: 'online' | 'offline' | 'cutting' | 'error';
  location?: string;
}

export default function InstallerSettingsPage() {
  const { user, login } = useAuth();
  const { setFilmWidth } = useWorkspaceStore();

  const [plotters, setPlotters] = useState<Plotter[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'hardware' | 'workspace' | 'security'>('profile');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Profile Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');

  // Hardware / Plotter Defaults
  const [defaultPlotterId, setDefaultPlotterId] = useState('');
  const [defaultFilmWidth, setDefaultFilmWidthState] = useState(1524);
  const [unit, setUnit] = useState<'in' | 'mm'>('in');
  const [cutSpeed, setCutSpeed] = useState(300);
  const [bladeForce, setBladeForce] = useState(120);

  // Workspace Defaults
  const [autoNestingMode, setAutoNestingMode] = useState('standard');
  const [edgeWrapMargin, setEdgeWrapMargin] = useState(6);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [confirmBeforeCut, setConfirmBeforeCut] = useState(true);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.token) return;
      try {
        setIsLoading(true);
        setError('');

        const [profileRes, plottersRes] = await Promise.all([
          fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch(`${API_URL}/plotters`, {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setShopName(data.shopName || '');

          const prefs = data.preferences || {};
          setDefaultPlotterId(prefs.defaultPlotterId || '');
          setDefaultFilmWidthState(prefs.defaultFilmWidth || 1524);
          setUnit(prefs.unit || 'in');
          setCutSpeed(prefs.cutSpeed || 300);
          setBladeForce(prefs.bladeForce || 120);
          setAutoNestingMode(prefs.autoNestingMode || 'standard');
          setEdgeWrapMargin(prefs.edgeWrapMargin || 6);
          setSoundAlerts(prefs.soundAlerts ?? true);
          setConfirmBeforeCut(prefs.confirmBeforeCut ?? true);
        } else {
          // Fallback to user object from auth context
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
          setEmail(user.email || '');
        }

        if (plottersRes.ok) {
          const pData = await plottersRes.json();
          setPlotters(pData);
        }
      } catch (err) {
        setError('Could not load profile settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setError('');
    setPasswordError('');
    setSaveSuccess(false);

    // Password validation if changing
    if (newPassword) {
      if (!currentPassword) {
        setPasswordError('Please provide your current password');
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
      const payload: any = {
        firstName,
        lastName,
        email,
        phone,
        shopName,
        preferences: {
          defaultPlotterId,
          defaultFilmWidth,
          unit,
          cutSpeed,
          bladeForce,
          autoNestingMode,
          edgeWrapMargin,
          soundAlerts,
          confirmBeforeCut,
        },
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        // Update auth state in localStorage so top-nav reflects name changes
        login({
          ...user,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
        });

        // Update default film width in workspaceStore
        setFilmWidth(defaultFilmWidth);

        setSaveSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to save settings');
      }
    } catch {
      setError('Cannot connect to the server');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Shop & Profile', icon: User },
    { id: 'hardware', label: 'Plotter & Hardware', icon: Printer },
    { id: 'workspace', label: 'Studio & Nesting', icon: Sliders },
    { id: 'security', label: 'Account & Security', icon: Lock },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Studio Settings</h1>
          <p className="text-neutral-500 mt-1">
            Configure your shop profile, plotter hardware defaults, and workspace preferences.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 rounded-xl shadow-xs self-start sm:self-auto"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm flex items-center gap-3 animate-in fade-in duration-300">
          <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold">Settings Saved Successfully</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your profile, plotter preferences, and studio defaults have been updated.
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
                  ? 'border-teal-600 text-teal-700 font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-neutral-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-8">
          {/* TAB 1: Shop & Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Installer Information</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Your personal details displayed in job cut logs and studio sessions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Workshop & Business Details</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Details of your PPF shop or installation center.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Shop / Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Film Specialists"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Hardware & Plotter Defaults */}
          {activeTab === 'hardware' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Default Cutting Plotter</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Select your primary machine for direct-send cut jobs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Connected Plotter</label>
                  <select
                    value={defaultPlotterId}
                    onChange={(e) => setDefaultPlotterId(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">Auto-detect / Any available online plotter</option>
                    {plotters.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.model}) — {p.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Default Cutting Speed (mm/s)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={50}
                        max={800}
                        value={cutSpeed}
                        onChange={(e) => setCutSpeed(Number(e.target.value))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
                        mm/s
                      </span>
                    </div>
                    <span className="text-2xs text-neutral-400 mt-1 block">Recommended for 8mil PPF: 250 - 350 mm/s</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Default Blade Force / Pressure (gf)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={30}
                        max={300}
                        value={bladeForce}
                        onChange={(e) => setBladeForce(Number(e.target.value))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
                        gf
                      </span>
                    </div>
                    <span className="text-2xs text-neutral-400 mt-1 block">Recommended: 110 - 140 gf depending on blade wear</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Default Film Roll Size</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Pre-set width loaded in the Nesting Workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { width: 1524, label: '60" Roll (1524 mm)', desc: 'Standard for full hood & bumper kits' },
                    { width: 914, label: '36" Roll (914 mm)', desc: 'Optimized for fenders, rockers, mirrors' },
                    { width: 610, label: '24" Roll (610 mm)', desc: 'Small parts & wear kit components' },
                  ].map((roll) => {
                    const isSelected = defaultFilmWidth === roll.width;
                    return (
                      <div
                        key={roll.width}
                        onClick={() => setDefaultFilmWidthState(roll.width)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 shadow-xs'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-neutral-900">{roll.label}</span>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-teal-600 bg-teal-600' : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">{roll.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Studio & Nesting */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Nesting & Pattern Layout</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Fine-tune automatic nesting algorithms and material conservation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Auto-Nesting Strategy
                    </label>
                    <select
                      value={autoNestingMode}
                      onChange={(e) => setAutoNestingMode(e.target.value)}
                      className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="standard">Standard (Balanced nesting speed & spacing)</option>
                      <option value="compact">Compact (Tightest squeeze, saves max material)</option>
                      <option value="safe">Safe Clearance (Extra gap for easier weeding)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Wrap Edge Allowance (Extra tucked margin)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min={0}
                        max={25}
                        value={edgeWrapMargin}
                        onChange={(e) => setEdgeWrapMargin(Number(e.target.value))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium">
                        mm
                      </span>
                    </div>
                    <span className="text-2xs text-neutral-400 mt-1 block">
                      Default is 6mm (0.25 in). Added around outer body borders for wrapping under panels.
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Audio & Confirmation Alerts</h3>
                  <p className="text-xs text-neutral-500 mt-1">Safety checks and feedback.</p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Sound Notifications</p>
                        <p className="text-xs text-neutral-500">Play chime when cutting finishes or if cutter errors.</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundAlerts}
                      onChange={(e) => setSoundAlerts(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Confirm Plotter Cut</p>
                        <p className="text-xs text-neutral-500">
                          Show confirmation modal with material estimate before sending G-code/HPGL.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={confirmBeforeCut}
                      onChange={(e) => setConfirmBeforeCut(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Account & Security */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Change Password</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Keep your account secure with a strong password.
                  </p>
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
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Account Status Card */}
              <div className="bg-neutral-50 rounded-3xl border border-neutral-200 p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Studio License Tier
                    </span>
                    <h4 className="text-lg font-bold text-neutral-900 mt-1">PPF Studio Professional</h4>
                  </div>
                  <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-3 py-1 rounded-full border border-teal-200">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs text-neutral-600 border-t border-neutral-200/60">
                  <div>
                    <span className="text-neutral-400 block">Role</span>
                    <strong className="text-neutral-800">{user?.role || 'INSTALLER'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Cutter Bridge</span>
                    <strong className="text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ready
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Pattern Access</span>
                    <strong className="text-neutral-800">Unlimited</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Plotters Connected</span>
                    <strong className="text-neutral-800">{plotters.length} Machines</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save bar */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-200">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 px-6 h-11 rounded-xl shadow-xs text-sm font-semibold"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save All Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
