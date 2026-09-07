'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Monitor, Wifi, WifiOff, Settings2, Activity,
  Printer, CheckCircle2, AlertCircle, Clock, RefreshCw, Plus,
  Trash2, X, Play, ShieldAlert, Cpu, Search, Check, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface Plotter {
  _id: string;
  name: string;
  model: string;
  ipAddress: string;
  port: number;
  status: 'online' | 'offline' | 'cutting' | 'error';
  filmWidth: number;
  location: string;
  lastSeen?: string;
  jobsToday?: number;
  totalJobs?: number;
  materialUsed?: string;
  notes?: string;
}

const statusConfig = {
  online:  { label: 'Online',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: <Wifi className="w-4 h-4 text-emerald-500" /> },
  cutting: { label: 'Cutting', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500 animate-pulse', icon: <Printer className="w-4 h-4 text-blue-500" /> },
  offline: { label: 'Offline', bg: 'bg-neutral-100',text: 'text-neutral-500', border: 'border-neutral-200', dot: 'bg-neutral-400', icon: <WifiOff className="w-4 h-4 text-neutral-400" /> },
  error:   { label: 'Error',   bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
};

export default function AdminPlottersPage() {
  const { user } = useAuth();
  const [plotters, setPlotters] = useState<Plotter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'cutting' | 'offline'>('all');

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlotter, setEditingPlotter] = useState<Plotter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    ipAddress: '',
    port: 9100,
    status: 'online' as 'online' | 'offline' | 'cutting' | 'error',
    filmWidth: 1524,
    location: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingPlotter, setDeletingPlotter] = useState<Plotter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Test connection state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [id: string]: { success: boolean; message: string; latencyMs?: number } }>({});

  const fetchPlotters = async () => {
    if (!user?.token) return;
    try {
      setIsRefreshing(true);
      const res = await fetch(`${API_URL}/plotters`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlotters(data);
      }
    } catch (err) {
      console.error('Failed to fetch plotters:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlotters();
  }, [user]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: '',
      model: 'Roland CAMM-1 GS-24',
      ipAddress: '192.168.1.10' + (plotters.length + 1),
      port: 9100,
      status: 'online',
      filmWidth: 1524,
      location: `Bay ${plotters.length + 1}`,
      notes: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (plotter: Plotter) => {
    setEditingPlotter(plotter);
    setFormData({
      name: plotter.name,
      model: plotter.model,
      ipAddress: plotter.ipAddress,
      port: plotter.port || 9100,
      status: plotter.status,
      filmWidth: plotter.filmWidth || 1524,
      location: plotter.location || '',
      notes: plotter.notes || '',
    });
    setFormError(null);
  };

  // Handle Save (Create or Update)
  const handleSavePlotter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    if (!formData.name.trim() || !formData.model.trim() || !formData.ipAddress.trim()) {
      setFormError('Please fill in Name, Model, and IP Address.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const url = editingPlotter 
        ? `${API_URL}/plotters/${editingPlotter._id}`
        : `${API_URL}/plotters`;

      const method = editingPlotter ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save plotter');
      }

      await fetchPlotters();
      setShowAddModal(false);
      setEditingPlotter(null);
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDeletePlotter = async () => {
    if (!deletingPlotter || !user?.token) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_URL}/plotters/${deletingPlotter._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setPlotters(prev => prev.filter(p => p._id !== deletingPlotter._id));
        setDeletingPlotter(null);
      }
    } catch (err) {
      console.error('Delete plotter failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async (plotterId: string) => {
    if (!user?.token) return;
    try {
      setTestingId(plotterId);
      const res = await fetch(`${API_URL}/plotters/${plotterId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const result = await res.json();
      setTestResults(prev => ({ ...prev, [plotterId]: result }));
      // Refresh list to pick up any updated lastSeen
      fetchPlotters();
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [plotterId]: { success: false, message: 'Connection test failed. Host unreachable.' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Filter plotters
  const filteredPlotters = plotters.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = !searchQuery || (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const onlineCount = plotters.filter(p => p.status === 'online' || p.status === 'cutting').length;
  const cuttingCount = plotters.filter(p => p.status === 'cutting').length;
  const totalJobsToday = plotters.reduce((s, p) => s + (p.jobsToday || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Cutting Plotters
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full font-medium font-mono">
              {onlineCount} Online
            </span>
          </h2>
          <p className="text-neutral-500 mt-1">Configure and manage HPGL cutting hardware connected via local TCP/IP network.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPlotters} 
            disabled={isRefreshing} 
            className="border-neutral-200 hover:bg-neutral-100 text-neutral-700 gap-2 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={openAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Plotter
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Plotters Online</p>
            <p className="text-2xl font-bold text-neutral-900">{onlineCount} <span className="text-sm font-normal text-neutral-400">/ {plotters.length}</span></p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Cuts Sent Today</p>
            <p className="text-2xl font-bold text-neutral-900">{totalJobsToday}</p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
            <Printer className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Active Cutting</p>
            <p className="text-2xl font-bold text-neutral-900">{cuttingCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, model, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'online', 'cutting', 'offline'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'text-neutral-600 hover:bg-neutral-100 border border-transparent'
              }`}
            >
              {st} {st !== 'all' && `(${plotters.filter(p => p.status === st).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Plotter Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 animate-pulse">
              <div className="h-6 bg-neutral-100 rounded-md w-1/2" />
              <div className="h-20 bg-neutral-50 rounded-lg" />
              <div className="h-8 bg-neutral-100 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredPlotters.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
          <Monitor className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-800">No plotters found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try changing your search or filter criteria.' : 'Get started by adding your first cutting plotter hardware.'}
          </p>
          <Button onClick={openAddModal} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Plotter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPlotters.map((plotter) => {
            const cfg = statusConfig[plotter.status] || statusConfig.online;
            const testRes = testResults[plotter._id];
            const isTesting = testingId === plotter._id;

            return (
              <div 
                key={plotter._id} 
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-neutral-100 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 text-sm leading-snug">{plotter.name}</h3>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">{plotter.model}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Card Specs */}
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wide mb-0.5">IP Address</p>
                        <p className="font-mono text-neutral-800 text-xs font-medium">{plotter.ipAddress}:{plotter.port}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wide mb-0.5">Location</p>
                        <p className="text-neutral-700 text-xs font-medium">{plotter.location || 'Bay 1'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wide mb-0.5">Film Roll Max</p>
                        <p className="text-neutral-700 text-xs font-medium">{plotter.filmWidth}mm ({plotter.filmWidth >= 1524 ? '60"' : plotter.filmWidth >= 914 ? '36"' : '24"'})</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wide mb-0.5">Last Activity</p>
                        <p className="text-neutral-700 text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {plotter.lastSeen ? new Date(plotter.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                        </p>
                      </div>
                    </div>

                    {/* Stats Box */}
                    <div className="pt-2 grid grid-cols-2 gap-2">
                      <div className="bg-neutral-50 rounded-lg p-2.5 text-center border border-neutral-100">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Jobs Today</p>
                        <p className="font-bold text-neutral-900 text-sm">{plotter.jobsToday || 0}</p>
                      </div>
                      <div className="bg-neutral-50 rounded-lg p-2.5 text-center border border-neutral-100">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Material Cut</p>
                        <p className="font-bold text-neutral-900 text-sm">{plotter.materialUsed || '0m'}</p>
                      </div>
                    </div>

                    {/* Connection Test Result Banner */}
                    {testRes && (
                      <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                        testRes.success 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {testRes.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-tight">{testRes.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 pb-4 pt-2 border-t border-neutral-100 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTestConnection(plotter._id)}
                    disabled={isTesting}
                    className="flex-1 h-8 text-xs border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                    title="Probe plotter TCP/IP connection"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1 text-teal-600" />
                    ) : (
                      <Cpu className="w-3 h-3 mr-1 text-teal-600" />
                    )}
                    Test Ping
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditModal(plotter)}
                    className="flex-1 h-8 text-xs border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  >
                    <Settings2 className="w-3 h-3 mr-1 text-neutral-500" /> Configure
                  </Button>

                  <Link href={`/admin/jobs?plotter=${plotter._id}`} className="flex-1">
                    <Button 
                      size="sm" 
                      className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Activity className="w-3 h-3 mr-1" /> Queue
                    </Button>
                  </Link>

                  <button
                    onClick={() => setDeletingPlotter(plotter)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove Plotter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-teal-50/60 border border-teal-200/60 rounded-xl p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
          <Monitor className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h4 className="font-semibold text-teal-900 text-sm">Plotter Hardware & HPGL Protocol</h4>
          <p className="text-teal-800 text-xs mt-1 leading-relaxed">
            Connected cutters accept HPGL and DMPL command streams directly from the Workspace cut engine. 
            When installers click <strong>Send to Plotter</strong>, cutting vector paths are transformed into plotter coordinate strokes and transmitted across the local LAN.
          </p>
        </div>
      </div>

      {/* ── ADD / EDIT PLOTTER MODAL ── */}
      {(showAddModal || editingPlotter) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base">
                    {editingPlotter ? 'Configure Plotter' : 'Add New Cutting Plotter'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {editingPlotter ? `Edit configuration for ${editingPlotter.name}` : 'Register a new network cutter station'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingPlotter(null); }}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSavePlotter} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Plotter Station Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Cutter Station A"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Hardware Model *</label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Roland CAMM-1 GS-24">Roland CAMM-1 GS-24</option>
                    <option value="Roland CAMM-1 GR-640">Roland CAMM-1 GR-640</option>
                    <option value="Graphtec CE7000-130">Graphtec CE7000-130</option>
                    <option value="Graphtec FC9000-160">Graphtec FC9000-160</option>
                    <option value="Summa S2 D75">Summa S2 D75</option>
                    <option value="Summa S2 T160">Summa S2 T160</option>
                    <option value="Generic HPGL Cutter">Generic HPGL Cutter</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Location / Bay</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Bay 1 - Main Floor"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">IP Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.101"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    placeholder="9100"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Max Film Width</label>
                  <select
                    value={formData.filmWidth}
                    onChange={(e) => setFormData({ ...formData, filmWidth: Number(e.target.value) })}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={1524}>60" Roll (1524mm)</option>
                    <option value={914}>36" Roll (914mm)</option>
                    <option value={610}>24" Roll (610mm)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="online">Online / Ready</option>
                    <option value="offline">Offline / Powered Off</option>
                    <option value="cutting">Cutting / Busy</option>
                    <option value="error">Error / Jammed</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">Notes & Settings</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Dedicated for high-gloss TPU film..."
                    rows={2}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowAddModal(false); setEditingPlotter(null); }}
                  className="flex-1 border-neutral-200 text-neutral-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSaving ? 'Saving...' : editingPlotter ? 'Update Plotter' : 'Create Plotter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingPlotter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-lg">Delete Plotter?</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5">
              Are you sure you want to remove <strong>{deletingPlotter.name}</strong> ({deletingPlotter.ipAddress})? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeletingPlotter(null)}
                className="flex-1 border-neutral-200 text-neutral-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeletePlotter}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
