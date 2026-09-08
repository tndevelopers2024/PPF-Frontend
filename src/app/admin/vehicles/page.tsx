'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Search, FileEdit, Trash, AlertTriangle, X, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddVehicleModal from '@/components/AddVehicleModal';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface Vehicle {
  _id: string;
  manufacturer: string;
  model: string;
  generation: string;
  year: number;
  variant?: string;
  bodyType?: string;
  status: string;
}

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Vehicle, '_id'>>();

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        setVehicles(await res.json());
      } else {
        setError('Failed to fetch vehicles');
      }
    } catch {
      setError('Cannot connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchVehicles();
  }, [user]);

  // When editTarget changes, pre-populate the form
  useEffect(() => {
    if (editTarget) {
      reset({
        manufacturer: editTarget.manufacturer,
        model: editTarget.model,
        generation: editTarget.generation || '',
        year: editTarget.year,
        variant: editTarget.variant || '',
        bodyType: editTarget.bodyType || '',
        status: editTarget.status,
      });
      setEditError('');
    }
  }, [editTarget, reset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/vehicles/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete vehicle');
      }
    } catch {
      setError('Cannot connect to the server');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget) return;
    setIsUpdating(true);
    setEditError('');
    try {
      const res = await fetch(`${API_URL}/vehicles/${editTarget._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setVehicles(prev => prev.map(v => v._id === updated._id ? updated : v));
        setEditTarget(null);
      } else {
        const errData = await res.json();
        setEditError(errData.message || 'Failed to update vehicle');
      }
    } catch {
      setEditError('Cannot connect to the server');
    } finally {
      setIsUpdating(false);
    }
  };

  // Dynamically extract unique manufacturers from the vehicle list
  const manufacturers = useMemo(() => {
    return Array.from(
      new Set(
        vehicles
          .map((v) => v.manufacturer?.trim())
          .filter((m): m is string => Boolean(m))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch = !term || (
        v.manufacturer?.toLowerCase().includes(term) ||
        v.model?.toLowerCase().includes(term) ||
        v.generation?.toLowerCase().includes(term) ||
        v.variant?.toLowerCase().includes(term) ||
        v.bodyType?.toLowerCase().includes(term) ||
        String(v.year).includes(term) ||
        `${v.manufacturer} ${v.model}`.toLowerCase().includes(term) ||
        `${v.manufacturer} ${v.model} ${v.year}`.toLowerCase().includes(term)
      );

      const matchesManufacturer = !selectedManufacturer ||
        v.manufacturer?.toLowerCase() === selectedManufacturer.toLowerCase();

      const matchesStatus = !selectedStatus ||
        v.status?.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesManufacturer && matchesStatus;
    });
  }, [vehicles, searchTerm, selectedManufacturer, selectedStatus]);

  const hasActiveFilters = Boolean(searchTerm || selectedManufacturer || selectedStatus);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedManufacturer('');
    setSelectedStatus('');
  };

  const inputClass = "w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-sm font-medium text-neutral-700";

  return (
    <div className="space-y-6">

      {/* ── Edit Modal ── */}
      {editTarget && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isUpdating && setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => !isUpdating && setEditTarget(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-neutral-900 mb-1">Edit Vehicle</h3>
            <p className="text-sm text-neutral-500 mb-6">
              Update details for <span className="font-medium text-neutral-700">{editTarget.manufacturer} {editTarget.model}</span>.
            </p>

            {editError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 mb-4">{editError}</div>
            )}

            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Manufacturer *</label>
                  <input {...register('manufacturer', { required: true })} className={inputClass} placeholder="e.g. BMW" />
                  {errors.manufacturer && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Model *</label>
                  <input {...register('model', { required: true })} className={inputClass} placeholder="e.g. X5" />
                  {errors.model && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Generation</label>
                  <input {...register('generation')} className={inputClass} placeholder="e.g. G05" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Year *</label>
                  <input type="number" {...register('year', { required: true, valueAsNumber: true })} className={inputClass} />
                  {errors.year && <p className="text-xs text-red-500">Required</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Variant</label>
                  <input {...register('variant')} className={inputClass} placeholder="e.g. xDrive40i" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Body Type</label>
                  <select {...register('bodyType')} className={inputClass}>
                    <option value="">Select Body Type</option>
                    <option value="SUV">SUV</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Coupe">Coupe</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={labelClass}>Status</label>
                  <select {...register('status')} className={inputClass}>
                    <option value="draft">Draft (Hidden from installers)</option>
                    <option value="active">Active (Published)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setEditTarget(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => !isDeleting && setDeleteTarget(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Delete Vehicle</h3>
                <p className="text-neutral-500 mt-2 text-sm leading-relaxed">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-neutral-800">
                    {deleteTarget.manufacturer} {deleteTarget.model} ({deleteTarget.year})
                  </span>
                  ? This action <span className="text-red-600 font-medium">cannot be undone</span>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Trash className="w-4 h-4 mr-2" />Delete</>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Vehicles</h2>
          <p className="text-neutral-500 mt-1">Manage your vehicle database and PPF patterns.</p>
        </div>
        <AddVehicleModal onSuccess={fetchVehicles} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vehicles..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-8 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full hover:bg-neutral-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              aria-label="Filter by manufacturer"
              className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              className="bg-white border border-neutral-200 text-neutral-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 whitespace-nowrap h-9 px-2.5"
                title="Reset all filters"
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
                Showing <strong className="text-neutral-800">{filteredVehicles.length}</strong> of{' '}
                <strong className="text-neutral-800">{vehicles.length}</strong>
              </span>
            ) : (
              <span>
                Total: <strong className="text-neutral-800">{vehicles.length}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">{error}</div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 min-w-[800px]">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Manufacturer</th>
                <th className="px-6 py-4 font-semibold">Model</th>
                <th className="px-6 py-4 font-semibold">Generation</th>
                <th className="px-6 py-4 font-semibold">Year</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm">No vehicles match your search or filter criteria.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-1 text-xs border-neutral-300"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      'No vehicles found. Click "Add Vehicle" to create one.'
                    )}
                  </td>
                </tr>
              ) : filteredVehicles.map((v) => (
                <tr key={v._id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{v.manufacturer}</td>
                  <td className="px-6 py-4">{v.model}</td>
                  <td className="px-6 py-4">{v.generation || '-'}</td>
                  <td className="px-6 py-4">{v.year}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      v.status === 'active'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {v.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit vehicle"
                        onClick={() => setEditTarget(v)}
                      >
                        <FileEdit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete vehicle"
                        onClick={() => setDeleteTarget(v)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
