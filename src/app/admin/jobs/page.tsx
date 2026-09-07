'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, AlertCircle, CheckCircle2, Clock, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface Job {
  _id: string;
  vehicleId?: { manufacturer?: string; model?: string; year?: number };
  installerId?: { firstName?: string; lastName?: string; email?: string };
  status: string;
  filmWidth: number;
  materialUsed: number;
  createdAt: string;
  patterns?: any[];
}

export default function AdminJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchJobs = async () => {
    if (!user?.token) return;
    try {
      setIsRefreshing(true);
      const res = await fetch('http://localhost:5000/api/jobs', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':    return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cutting':   return <Printer className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processing':return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:          return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':  return 'text-green-600 font-medium';
      case 'failed':     return 'text-red-600 font-medium';
      case 'cutting':    return 'text-blue-600 font-medium';
      case 'processing': return 'text-yellow-600 font-medium';
      case 'queued':     return 'text-purple-600 font-medium';
      default:           return 'text-neutral-500';
    }
  };

  const filteredJobs = jobs.filter(j => {
    const vehicleStr = j.vehicleId
      ? `${j.vehicleId.manufacturer || ''} ${j.vehicleId.model || ''} ${j.vehicleId.year || ''}`.toLowerCase()
      : '';
    const installerStr = j.installerId
      ? `${j.installerId.firstName || ''} ${j.installerId.lastName || ''} ${j.installerId.email || ''}`.toLowerCase()
      : '';
    const matchesSearch = vehicleStr.includes(searchTerm.toLowerCase()) || installerStr.includes(searchTerm.toLowerCase()) || j._id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filmWidthLabel = (mm: number) => {
    if (mm >= 1524) return `60" (${mm}mm)`;
    if (mm >= 914) return `36" (${mm}mm)`;
    return `24" (${mm}mm)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Cutting Jobs</h2>
          <p className="text-neutral-500 mt-1">Monitor and manage plotter cutting jobs globally.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          disabled={isRefreshing}
          className="border-neutral-200 hover:bg-neutral-100 text-neutral-700 gap-2 h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['queued', 'cutting', 'completed', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`bg-white border rounded-xl p-4 text-left hover:border-blue-300 transition-all ${statusFilter === s ? 'border-blue-400 ring-1 ring-blue-300' : 'border-neutral-200'}`}
          >
            <p className="text-xs text-neutral-400 capitalize mb-1">{s}</p>
            <p className="text-xl font-bold text-neutral-900">{jobs.filter(j => j.status === s).length}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by Job ID, Installer, or Vehicle..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="cutting">Cutting</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 min-w-[900px]">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Job ID</th>
                <th className="px-6 py-4 font-semibold">Installer</th>
                <th className="px-6 py-4 font-semibold">Vehicle</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Material Used</th>
                <th className="px-6 py-4 font-semibold">Film Width</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-neutral-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading jobs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                    No jobs found.
                  </td>
                </tr>
              ) : filteredJobs.map((job) => {
                const vehicleLabel = job.vehicleId
                  ? `${job.vehicleId.manufacturer || ''} ${job.vehicleId.model || ''} ${job.vehicleId.year || ''}`.trim()
                  : '—';
                const installerLabel = job.installerId
                  ? `${job.installerId.firstName || ''} ${job.installerId.lastName || ''}`.trim()
                  : '—';
                return (
                  <tr key={job._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-neutral-900 text-xs">{job._id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4">{installerLabel}</td>
                    <td className="px-6 py-4 font-medium text-neutral-800">{vehicleLabel}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 capitalize">
                        {getStatusIcon(job.status)}
                        <span className={getStatusClass(job.status)}>{job.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{(job.materialUsed / 1000).toFixed(2)}m</td>
                    <td className="px-6 py-4 text-neutral-500">{filmWidthLabel(job.filmWidth)}</td>
                    <td className="px-6 py-4 text-neutral-400 text-xs">{new Date(job.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-blue-600 hover:bg-blue-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
