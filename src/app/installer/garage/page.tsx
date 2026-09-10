'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Car, 
  Search, 
  Plus, 
  Scissors, 
  Trash2, 
  Edit3, 
  X, 
  Calendar, 
  User, 
  Phone, 
  Tag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface Vehicle {
  _id: string;
  manufacturer: string;
  model: string;
  year: number;
  variant?: string;
  image?: string;
  status: string;
}

interface GarageItem {
  _id: string;
  userId: string;
  vehicleId: Vehicle;
  customerName?: string;
  customerPhone?: string;
  licensePlate?: string;
  vin?: string;
  selectedPackage?: string;
  status: 'booked' | 'in_shop' | 'ready_to_cut' | 'cutting' | 'completed';
  priority: 'low' | 'normal' | 'urgent';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
  in_shop: {
    label: 'In Shop',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  ready_to_cut: {
    label: 'Ready to Cut',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  cutting: {
    label: 'Cutting',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  booked: {
    label: 'Booked',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

const commonPackages = [
  'Full Front PPF',
  'Track Pack (Full Front + Rockers)',
  'Full Vehicle Wrap',
  'High Wear Areas (Door Cups, Edges, Trunk)',
  'Hood & Fenders Only',
  'Custom Kit',
];

export default function InstallerGaragePage() {
  const { user } = useAuth();
  const [garageItems, setGarageItems] = useState<GarageItem[]>([]);
  const [catalogVehicles, setCatalogVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GarageItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<GarageItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    customerName: '',
    customerPhone: '',
    licensePlate: '',
    vin: '',
    selectedPackage: 'Full Front PPF',
    status: 'in_shop' as GarageItem['status'],
    priority: 'normal' as GarageItem['priority'],
    notes: '',
  });

  const fetchGarageItems = async () => {
    if (!user?.token) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/garage`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGarageItems(data);
      } else {
        setError('Failed to load garage items');
      }
    } catch {
      setError('Cannot connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogVehicles = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data: Vehicle[] = await res.json();
        setCatalogVehicles(data.filter((v) => v.status === 'active'));
      }
    } catch {}
  };

  useEffect(() => {
    fetchGarageItems();
    fetchCatalogVehicles();
  }, [user]);

  const openAddModal = (preselectedVehicleId = '') => {
    setFormData({
      vehicleId: preselectedVehicleId || (catalogVehicles[0]?._id || ''),
      customerName: '',
      customerPhone: '',
      licensePlate: '',
      vin: '',
      selectedPackage: 'Full Front PPF',
      status: 'in_shop',
      priority: 'normal',
      notes: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: GarageItem) => {
    setEditingItem(item);
    setFormData({
      vehicleId: item.vehicleId?._id || '',
      customerName: item.customerName || '',
      customerPhone: item.customerPhone || '',
      licensePlate: item.licensePlate || '',
      vin: item.vin || '',
      selectedPackage: item.selectedPackage || 'Full Front PPF',
      status: item.status || 'in_shop',
      priority: item.priority || 'normal',
      notes: item.notes || '',
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    if (!formData.vehicleId) {
      alert('Please select a vehicle');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update
        const res = await fetch(`${API_URL}/garage/${editingItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const updated = await res.json();
          setGarageItems((prev) =>
            prev.map((item) => (item._id === updated._id ? updated : item))
          );
          setEditingItem(null);
        } else {
          const data = await res.json();
          alert(data.message || 'Failed to update garage item');
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/garage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setGarageItems((prev) => [created, ...prev]);
          setShowAddModal(false);
        } else {
          const data = await res.json();
          alert(data.message || 'Failed to add vehicle to garage');
        }
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem || !user?.token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/garage/${deletingItem._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setGarageItems((prev) => prev.filter((item) => item._id !== deletingItem._id));
        setDeletingItem(null);
      } else {
        alert('Failed to remove vehicle');
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (itemId: string, newStatus: GarageItem['status']) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_URL}/garage/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGarageItems((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered garage items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return garageItems.filter((item) => {
      const v = item.vehicleId;
      const vehicleText = v
        ? `${v.manufacturer} ${v.model} ${v.year} ${v.variant || ''}`
        : '';

      const matchesSearch =
        !q ||
        vehicleText.toLowerCase().includes(q) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.licensePlate && item.licensePlate.toLowerCase().includes(q)) ||
        (item.vin && item.vin.toLowerCase().includes(q)) ||
        (item.selectedPackage && item.selectedPackage.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [garageItems, searchQuery, statusFilter, priorityFilter]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all');

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: garageItems.length,
      inShop: garageItems.filter((i) => i.status === 'in_shop').length,
      readyToCut: garageItems.filter((i) => i.status === 'ready_to_cut').length,
      cutting: garageItems.filter((i) => i.status === 'cutting').length,
      completed: garageItems.filter((i) => i.status === 'completed').length,
    };
  }, [garageItems]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">My Garage</h1>
            <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-200">
              Active Workshop
            </span>
          </div>
          <p className="text-neutral-500 mt-1">
            Manage customer vehicles, assigned PPF packages, and quick-cut workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/installer">
            <Button
              variant="outline"
              className="border-neutral-200 hover:bg-neutral-50 text-neutral-700 gap-2 h-10 rounded-xl"
            >
              <Search className="w-4 h-4" />
              Browse Catalog
            </Button>
          </Link>
          <Button
            onClick={() => openAddModal()}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle to Garage
          </Button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total in Garage</span>
            <Car className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{stats.total}</p>
          <span className="text-xs text-neutral-400 mt-1">Active customer jobs</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-semibold uppercase tracking-wider">In Shop</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{stats.inShop}</p>
          <span className="text-xs text-neutral-400 mt-1">Vehicles on site</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Ready to Cut</span>
            <Scissors className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{stats.readyToCut}</p>
          <span className="text-xs text-neutral-400 mt-1">Ready for plotter</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">{stats.completed}</p>
          <span className="text-xs text-neutral-400 mt-1">Installed & ready</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by make, model, customer, plate..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-9 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full hover:bg-neutral-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              aria-label="Filter by status"
              className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="in_shop">In Shop</option>
              <option value="ready_to_cut">Ready to Cut</option>
              <option value="cutting">Cutting</option>
              <option value="completed">Completed</option>
              <option value="booked">Booked</option>
            </select>

            {/* Priority Filter */}
            <select
              aria-label="Filter by priority"
              className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔥 Urgent</option>
              <option value="normal">Normal Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 whitespace-nowrap h-9 px-2.5 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {!isLoading && (
          <div className="text-xs text-neutral-500 self-end sm:self-center shrink-0">
            {hasActiveFilters ? (
              <span>
                Showing <strong className="text-neutral-800">{filteredItems.length}</strong> of{' '}
                <strong className="text-neutral-800">{garageItems.length}</strong>
              </span>
            ) : (
              <span>
                Total: <strong className="text-neutral-800">{garageItems.length}</strong> vehicles
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Garage Vehicles List */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center shadow-sm">
          {hasActiveFilters ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800">No matching vehicles found</h3>
              <p className="text-sm text-neutral-500">
                None of your garage vehicles matched "{searchQuery || statusFilter}". Try adjusting your filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-2 border-neutral-300 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-5">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100">
                <Car className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Your Garage is Empty</h3>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  Add vehicles currently parked in your shop or booked for PPF installation to easily access their cut patterns and track customer jobs.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => openAddModal()}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Vehicle
                </Button>
                <Link href="/installer">
                  <Button variant="outline" className="border-neutral-200 rounded-xl">
                    Browse Vehicle Database
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const v = item.vehicleId;
            const currentStatus = statusMap[item.status] || {
              label: item.status,
              bg: 'bg-neutral-100',
              text: 'text-neutral-700',
              border: 'border-neutral-200',
            };

            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-neutral-200 hover:border-teal-300 transition-all hover:shadow-md overflow-hidden flex flex-col justify-between shadow-xs group"
              >
                {/* Card Top */}
                <div className="p-6 space-y-4">
                  {/* Status & Priority Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
                    >
                      {item.status === 'cutting' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      )}
                      {currentStatus.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                          Urgent
                        </span>
                      )}

                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                        title="Edit customer / job details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove from garage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Name & Details */}
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 group-hover:text-teal-700 transition-colors">
                      {v ? `${v.year} ${v.manufacturer} ${v.model}` : 'Unknown Vehicle'}
                    </h3>
                    {v && v.variant && (
                      <p className="text-xs text-neutral-500 mt-1 font-medium">
                        {v.variant}
                      </p>
                    )}
                  </div>

                  {/* Package & Customer Details Block */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 space-y-2 text-xs border border-neutral-100">
                    <div className="flex items-center justify-between text-neutral-700 font-medium">
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <Tag className="w-3.5 h-3.5 text-teal-600" />
                        Package
                      </span>
                      <span className="text-neutral-900 font-semibold">{item.selectedPackage || 'Full Front PPF'}</span>
                    </div>

                    {(item.customerName || item.customerPhone) && (
                      <div className="flex items-center justify-between text-neutral-700">
                        <span className="flex items-center gap-1.5 text-neutral-500">
                          <User className="w-3.5 h-3.5" />
                          Customer
                        </span>
                        <span className="text-neutral-900 font-medium">
                          {item.customerName || 'N/A'}{item.customerPhone ? ` (${item.customerPhone})` : ''}
                        </span>
                      </div>
                    )}

                    {(item.licensePlate || item.vin) && (
                      <div className="flex items-center justify-between text-neutral-700">
                        <span className="flex items-center gap-1.5 text-neutral-500">
                          <Car className="w-3.5 h-3.5" />
                          Plate / VIN
                        </span>
                        <span className="font-mono text-neutral-900 font-medium uppercase">
                          {item.licensePlate || item.vin}
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <div className="pt-1 border-t border-neutral-200/60 text-neutral-600 italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Quick Actions */}
                <div className="px-6 py-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between gap-3">
                  {/* Status Dropdown Quick Switcher */}
                  <div className="relative inline-block text-left">
                    <select
                      className="bg-white border border-neutral-200 text-neutral-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-2xs font-medium"
                      value={item.status}
                      onChange={(e) => handleQuickStatusChange(item._id, e.target.value as any)}
                    >
                      <option value="in_shop">Status: In Shop</option>
                      <option value="ready_to_cut">Status: Ready to Cut</option>
                      <option value="cutting">Status: Cutting</option>
                      <option value="completed">Status: Completed</option>
                      <option value="booked">Status: Booked</option>
                    </select>
                  </div>

                  {/* Open in Studio Button */}
                  {v?._id ? (
                    <Link href={`/installer/vehicles/${v._id}`}>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 text-xs font-semibold shadow-xs"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Cut Patterns
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled size="sm" className="rounded-xl text-xs">
                      No Patterns
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Vehicle Modal ── */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingItem ? 'Edit Garage Vehicle' : 'Add Vehicle to Garage'}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Assign customer info, required PPF pattern packages, and current job status.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Vehicle Selector (only for add) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Select Vehicle *
                </label>
                {editingItem ? (
                  <div className="p-3 bg-neutral-100 rounded-xl text-sm font-semibold text-neutral-800 border border-neutral-200">
                    {editingItem.vehicleId?.year} {editingItem.vehicleId?.manufacturer}{' '}
                    {editingItem.vehicleId?.model}
                  </div>
                ) : (
                  <select
                    required
                    className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  >
                    <option value="">Select a vehicle from catalog...</option>
                    {catalogVehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.year} {v.manufacturer} {v.model}{' '}
                        {v.variant ? `(${v.variant})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Package Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Target PPF Package
                </label>
                <select
                  className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  value={formData.selectedPackage}
                  onChange={(e) => setFormData({ ...formData, selectedPackage: e.target.value })}
                >
                  {commonPackages.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Miller"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. (555) 234-5678"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              </div>

              {/* License Plate & VIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    License Plate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7XYZ991"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    VIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Last 6 or 17 digits"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Job Status
                  </label>
                  <select
                    className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="in_shop">In Shop</option>
                    <option value="ready_to_cut">Ready to Cut</option>
                    <option value="cutting">Cutting</option>
                    <option value="completed">Completed</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    className="w-full bg-white border border-neutral-200 text-neutral-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">🔥 Urgent Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Installer Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extended wrapped edges requested on hood & mirrors..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="rounded-xl border-neutral-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Garage'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Remove from Garage?</h3>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Are you sure you want to remove{' '}
                <strong className="text-neutral-800">
                  {deletingItem.vehicleId?.year} {deletingItem.vehicleId?.manufacturer}{' '}
                  {deletingItem.vehicleId?.model}
                </strong>{' '}
                from your garage? This will not delete the vehicle or cut history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingItem(null)}
                className="rounded-xl border-neutral-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteItem}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Removing...' : 'Remove Vehicle'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
