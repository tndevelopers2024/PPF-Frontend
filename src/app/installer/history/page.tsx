'use client';

import { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle2, Clock, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface Job {
  _id: string;
  vehicleId?: { manufacturer?: string; model?: string; year?: number };
  status: string;
  filmWidth: number;
  materialUsed: number;
  createdAt: string;
  patterns?: { name?: string }[];
}

export default function InstallerHistoryPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchJobs = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/jobs', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to load job history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':  return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':     return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'cutting':    return <Printer className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      default:           return <Clock className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':  return 'bg-green-100 text-green-700 border border-green-200';
      case 'failed':     return 'bg-red-100 text-red-700 border border-red-200';
      case 'cutting':    return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'processing': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'queued':     return 'bg-purple-100 text-purple-700 border border-purple-200';
      default:           return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
  };

  const filmWidthLabel = (mm: number) => {
    if (mm >= 1524) return `60" Roll`;
    if (mm >= 914) return `36" Roll`;
    return `24" Roll`;
  };

  const filteredJobs = jobs.filter(j => {
    const vehicleStr = j.vehicleId
      ? `${j.vehicleId.manufacturer || ''} ${j.vehicleId.model || ''} ${j.vehicleId.year || ''}`.toLowerCase()
      : '';
    const matchesSearch = vehicleStr.includes(searchTerm.toLowerCase()) || j._id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Cut History</h1>
          <p className="text-neutral-500 mt-1">Track your recent plotter jobs and material usage.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          disabled={loading}
          className="border-neutral-200 hover:bg-neutral-50 text-neutral-700 gap-2 h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by Job ID or Vehicle..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="cutting">Cutting</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 flex items-center justify-center gap-3 text-neutral-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading your job history...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400">
            <Printer className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-neutral-500">No jobs found.</p>
            <p className="text-sm text-neutral-400 mt-1">Send patterns from the workspace to create a cutting job.</p>
          </div>
        ) : filteredJobs.map((job) => {
          const vehicleLabel = job.vehicleId
            ? `${job.vehicleId.manufacturer || ''} ${job.vehicleId.model || ''} ${job.vehicleId.year || ''}`.trim()
            : 'Unknown Vehicle';
          const jobShortId = `JOB-${job._id.slice(-6).toUpperCase()}`;

          return (
            <div
              key={job._id}
              className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-teal-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200 shrink-0">
                  {getStatusIcon(job.status)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{vehicleLabel}</h3>
                  <p className="text-sm text-neutral-500">
                    {jobShortId} • {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8 sm:gap-12 text-sm">
                <div className="text-center">
                  <p className="text-neutral-400 text-xs mb-0.5">Roll Size</p>
                  <p className="text-neutral-900 font-semibold">{filmWidthLabel(job.filmWidth)}</p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-400 text-xs mb-0.5">Material Used</p>
                  <p className="text-neutral-900 font-semibold">{(job.materialUsed / 1000).toFixed(2)}m</p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-400 text-xs mb-0.5">Patterns</p>
                  <p className="text-neutral-900 font-semibold">{job.patterns?.length ?? 0}</p>
                </div>
                <div className="text-center min-w-[90px]">
                  <p className="text-neutral-400 text-xs mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400"
                >
                  Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

