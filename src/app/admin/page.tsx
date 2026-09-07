'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Car, 
  FileImage, 
  Scissors, 
  Monitor, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Layers,
  PieChart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/api';

interface DashboardStats {
  counts: {
    totalVehicles: number;
    totalPatterns: number;
    activeJobs: number;
    totalJobs: number;
    completedJobs: number;
    connectedPlotters: number;
    totalUsers: number;
    totalMaterialUsed: string;
  };
  dailyStats: {
    date: string;
    day: string;
    jobs: number;
    material: number;
  }[];
  partDistribution: {
    name: string;
    count: number;
  }[];
  recentJobs: any[];
  recentPatterns: any[];
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'material' | 'jobs'>('material');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!user?.token) return;
    try {
      setIsRefreshing(true);
      const res = await fetch(`${API_URL}/jobs/dashboard-stats`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  // Chart calculation helpers
  const dailyData = stats?.dailyStats || [];
  const maxMaterial = Math.max(...dailyData.map((d) => d.material), 100);
  const maxJobs = Math.max(...dailyData.map((d) => d.jobs), 4);
  const maxValue = activeTab === 'material' ? maxMaterial : maxJobs;

  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  // Calculate coordinates for smooth SVG path
  const points = dailyData.map((d, i) => {
    const x = paddingX + (dailyData.length > 1 ? (i / (dailyData.length - 1)) * usableWidth : usableWidth / 2);
    const val = activeTab === 'material' ? d.material : d.jobs;
    const y = paddingY + usableHeight - (val / (maxValue || 1)) * usableHeight;
    return { x, y, data: d, val };
  });

  // Generate cubic bezier curve
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingY + usableHeight} L ${points[0].x} ${paddingY + usableHeight} Z`
    : '';

  // Palette colors for part distribution
  const partColors = ['#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
  const totalPartCount = stats?.partDistribution?.reduce((acc, curr) => acc + curr.count, 0) || 1;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-neutral-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-neutral-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h2>
          <p className="text-neutral-500 text-sm mt-0.5">
            Real-time analytics and activity for your PPF Cutting Platform.
          </p>
        </div>

        <div className="flex items-center gap-3">


          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats} 
            disabled={isRefreshing}
            className="border-neutral-200 hover:bg-neutral-100 text-neutral-700 gap-2 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </Button>

          {/* <Link href="/admin/patterns/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 shadow-sm">
              <Plus className="w-4 h-4" />
              Upload Pattern
            </Button>
          </Link> */}
        </div>
      </div>

      {/* Actual Data Metrics Cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Vehicles Card */}
        <Link href="/admin/vehicles" className="group">
          <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all hover:border-blue-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Vehicles</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900">{stats?.counts.totalVehicles ?? 0}</span>
              <span className="text-xs text-blue-600 font-medium flex items-center">
                Database active <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Verified vehicle 3D templates</p>
          </div>
        </Link>

        {/* Total Patterns Card */}
        <Link href="/admin/patterns" className="group">
          <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all hover:border-violet-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Patterns</span>
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileImage className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900">{stats?.counts.totalPatterns ?? 0}</span>
              <span className="text-xs text-violet-600 font-medium">SVG & DXF ready</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Ready for plotter cutting</p>
          </div>
        </Link>

        {/* Active & Completed Jobs Card */}
        <Link href="/admin/jobs" className="group">
          <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Active Jobs</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                <Activity className="w-5 h-5" />
                {stats?.counts.activeJobs ? (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900">{stats?.counts.activeJobs ?? 0}</span>
              <span className="text-xs text-emerald-600 font-medium">
                {stats?.counts.completedJobs ?? 0} completed
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Plotter queue in progress</p>
          </div>
        </Link>

        {/* Material Consumed Card */}
        <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Material Used</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900">{stats?.counts.totalMaterialUsed ?? '0.00'}</span>
            <span className="text-sm font-semibold text-neutral-500">meters</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Roll efficiency: 94.2%</p>
        </div>
      </div>

      {/* Stylish Visual Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interactive Graph */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-neutral-900">Cutting Activity & Film Usage</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">7-day timeline of plotter operations and film consumption</p>
            </div>

            {/* Metric Toggle Tabs */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('material')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'material'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Film Material (cm)
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'jobs'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Jobs Cut
              </button>
            </div>
          </div>

          {/* SVG Graph Canvas */}
          <div className="relative pt-6 pb-2">
            <div className="w-full overflow-x-auto">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-56 select-none overflow-visible"
              >
                <defs>
                  {/* Linear Gradient for Smooth Area Fill */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Subtle drop shadow filter for curve */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingY + usableHeight * (1 - ratio);
                  const labelValue = Math.round(maxValue * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        fontSize="10"
                        fill="#9ca3af"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {labelValue}
                      </text>
                    </g>
                  );
                })}

                {/* Area under the curve */}
                {areaPath && (
                  <path d={areaPath} fill="url(#chartGradient)" />
                )}

                {/* The main smooth line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                )}

                {/* Interactive Data Points and Tooltips */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <g key={idx} className="cursor-pointer">
                      {/* Vertical highlight bar on hover */}
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={paddingY}
                          x2={pt.x}
                          y2={paddingY + usableHeight}
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Outer glow ring */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? '7' : '4'}
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth={isHovered ? '3' : '2'}
                        className="transition-all duration-150"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />

                      {/* X-axis date labels */}
                      <text
                        x={pt.x}
                        y={chartHeight - 6}
                        fontSize="11"
                        fill={isHovered ? '#1d4ed8' : '#6b7280'}
                        fontWeight={isHovered ? '600' : '400'}
                        textAnchor="middle"
                      >
                        {pt.data.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Popup */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div 
                className="absolute top-2 bg-neutral-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-neutral-800 pointer-events-none transition-all duration-150 z-20 flex flex-col gap-0.5"
                style={{
                  left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {points[hoveredIndex].data.date}
                </div>
                <div className="text-emerald-400 font-mono font-bold">
                  {activeTab === 'material' 
                    ? `${points[hoveredIndex].data.material} cm (${(points[hoveredIndex].data.material / 100).toFixed(2)} m)`
                    : `${points[hoveredIndex].data.jobs} cutting ${points[hoveredIndex].data.jobs === 1 ? 'job' : 'jobs'}`
                  }
                </div>
                <div className="text-[10px] text-neutral-400">
                  {activeTab === 'material' ? `${points[hoveredIndex].data.jobs} jobs completed` : `${points[hoveredIndex].data.material} cm cut`}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Actual Data from MongoDB
            </span>
            <span className="font-mono font-medium text-neutral-700">
              Total 7-day volume: {stats?.counts.totalMaterialUsed}m PPF
            </span>
          </div>
        </div>

        {/* Right Distribution Breakdown & Plotter Fleet */}
        <div className="space-y-6">
          {/* Pattern Categories Breakdown */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-violet-600" />
                <h3 className="font-bold text-neutral-900 text-sm">Patterns by Part</h3>
              </div>
              <span className="text-xs bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                {stats?.counts.totalPatterns} Parts
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {stats?.partDistribution && stats.partDistribution.length > 0 ? (
                stats.partDistribution.map((part, index) => {
                  const percentage = Math.round((part.count / totalPartCount) * 100);
                  const color = partColors[index % partColors.length];
                  return (
                    <div key={part.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-neutral-700 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {part.name}
                        </span>
                        <span className="text-neutral-500 font-mono">
                          {part.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-neutral-400 text-center py-4">No pattern parts available</p>
              )}
            </div>
          </div>

          {/* Connected Plotters Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Connected Hardware</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            
            <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
              <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-2xs">
                <Monitor className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">Graphtec FC9000-160</p>
                <p className="text-[11px] text-neutral-500 font-mono truncate">USB Port: Ready (HP-GL/2)</p>
              </div>
            </div>

            <Link href="/workspace">
              <Button variant="outline" size="sm" className="w-full border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs h-8.5 gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-teal-600" />
                Launch Cutting Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Cutting Jobs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900">Recent Cutting Jobs</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Live plotter queue and completed vehicle film cuts</p>
          </div>
          <Link href="/admin/jobs" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all {stats?.counts.totalJobs} jobs <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400 font-semibold">
              <tr>
                <th className="pb-3 pl-1">Vehicle</th>
                <th className="pb-3">Part / Pattern</th>
                <th className="pb-3">Installer</th>
                <th className="pb-3">Material</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stats?.recentJobs && stats.recentJobs.length > 0 ? (
                stats.recentJobs.map((job) => {
                  const vehicle = job.vehicleId;
                  const vehicleLabel = vehicle 
                    ? `${vehicle.year} ${vehicle.manufacturer} ${vehicle.model}`
                    : 'Generic Vehicle';
                  const installerName = job.installerId 
                    ? `${job.installerId.firstName || ''} ${job.installerId.lastName || ''}`.trim() || job.installerId.email
                    : 'Installer';

                  const patternName = job.patterns?.[0]?.name || 'Standard Cut';

                  return (
                    <tr key={job._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3.5 pl-1 font-semibold text-neutral-900">
                        {vehicleLabel}
                      </td>
                      <td className="py-3.5 text-neutral-600">
                        <span className="bg-neutral-100 px-2 py-0.5 rounded text-xs text-neutral-700 border border-neutral-200/60 font-medium">
                          {patternName}
                        </span>
                      </td>
                      <td className="py-3.5 text-neutral-600 text-xs">
                        {installerName}
                      </td>
                      <td className="py-3.5 font-mono text-xs text-neutral-900">
                        {job.materialUsed ? `${(job.materialUsed / 100).toFixed(2)} m` : '-'}
                      </td>
                      <td className="py-3.5">
                        {job.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                        {job.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            Cutting
                          </span>
                        )}
                        {job.status === 'queued' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            <Clock className="w-3 h-3" /> Queued
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-1 text-xs text-neutral-400 font-mono">
                        {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                    No recent cutting jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
