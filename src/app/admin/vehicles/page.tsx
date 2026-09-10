'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import {
  Search,
  FileEdit,
  Trash,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
  Scissors,
  FileCode,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddVehicleModal from '@/components/AddVehicleModal';
import Combobox from '@/components/ui/combobox';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';
import { VEHICLE_CATEGORIES } from '@/lib/constants';

interface PatternInfo {
  _id: string;
  name: string;
  part?: string;
  patternType?: string;
  status: string;
  files?: {
    svg?: { url?: string };
    dxf?: { url?: string };
  };
}

interface Vehicle {
  _id: string;
  manufacturer: string;
  model: string;
  year: number;
  variant?: string;
  category?: string;
  status: string;
  pattern?: PatternInfo | null;
}

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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
  const [editPatternName, setEditPatternName] = useState('');
  const [editPatternFile, setEditPatternFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { user, logout } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Omit<Vehicle, '_id' | 'pattern'>>();

  const watchedEditCategory = watch('category');
  const watchedEditManufacturer = watch('manufacturer');
  const watchedEditModel = watch('model');
  const watchedEditVariant = watch('variant');
  const watchedEditYear = watch('year');

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setVehicles(await res.json());
      } else if (res.status === 401) {
        logout();
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

  // When editTarget changes, pre-populate form and pattern details
  useEffect(() => {
    if (editTarget) {
      reset({
        manufacturer: editTarget.manufacturer,
        model: editTarget.model,
        year: editTarget.year,
        variant: editTarget.variant || '',
        category: editTarget.category || 'Exterior Of Car',
        status: editTarget.status,
      });
      setEditPatternName(editTarget.pattern?.name || '');
      setEditPatternFile(null);
      setEditError('');
    }
  }, [editTarget, reset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/vehicles/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setVehicles((prev) => prev.filter((v) => v._id !== deleteTarget._id));
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
      // 1. Update vehicle data
      const res = await fetch(`${API_URL}/vehicles/${editTarget._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        let errMessage = 'Failed to update vehicle';
        try {
          const errData = await res.json();
          errMessage = errData.message || errMessage;
        } catch {
          errMessage = `Server error (${res.status})`;
        }
        if (res.status === 401) {
          errMessage = 'Your session has expired. Please sign out and sign in again.';
        }
        throw new Error(errMessage);
      }

      const updated = await res.json();

      // 2. If pattern name or file changed, update pattern
      let updatedPattern = editTarget.pattern;
      if (editTarget.pattern?._id) {
        if (editPatternName.trim() && editPatternName !== editTarget.pattern.name) {
          const resPat = await fetch(`${API_URL}/patterns/${editTarget.pattern._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user?.token}`,
            },
            body: JSON.stringify({ name: editPatternName.trim() }),
          });
          if (resPat.ok) {
            updatedPattern = await resPat.json();
          }
        }

        if (editPatternFile) {
          const formData = new FormData();
          formData.append('file', editPatternFile);
          const resUpload = await fetch(`${API_URL}/patterns/${editTarget.pattern._id}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${user?.token}` },
            body: formData,
          });
          if (resUpload.ok) {
            const uploadData = await resUpload.json();
            updatedPattern = uploadData.pattern || updatedPattern;
          }
        }
      } else if (editPatternName.trim() || editPatternFile) {
        // Create pattern if none previously existed
        const resCreatePat = await fetch(`${API_URL}/patterns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            vehicleId: editTarget._id,
            name: editPatternName.trim() || `${data.manufacturer} ${data.model} Pattern`,
            part: 'Full Vehicle Kit',
            patternType: data.category === 'Window Film' ? 'Window Film' : 'Paint Protection Film',
            status: 'published',
          }),
        });
        if (resCreatePat.ok) {
          const newPat = await resCreatePat.json();
          if (editPatternFile) {
            const formData = new FormData();
            formData.append('file', editPatternFile);
            const resUpload = await fetch(`${API_URL}/patterns/${newPat._id}/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${user?.token}` },
              body: formData,
            });
            if (resUpload.ok) {
              const uploadData = await resUpload.json();
              updatedPattern = uploadData.pattern || newPat;
            } else {
              updatedPattern = newPat;
            }
          } else {
            updatedPattern = newPat;
          }
        }
      }

      setVehicles((prev) =>
        prev.map((v) =>
          v._id === updated._id ? { ...updated, pattern: updatedPattern } : v
        )
      );
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err.message || 'Cannot connect to the server');
    } finally {
      setIsUpdating(false);
    }
  };

  // Dynamically extract unique manufacturers strictly from the DB vehicle list
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
      const matchesSearch =
        !term ||
        v.manufacturer?.toLowerCase().includes(term) ||
        v.model?.toLowerCase().includes(term) ||
        v.variant?.toLowerCase().includes(term) ||
        v.category?.toLowerCase().includes(term) ||
        v.pattern?.name?.toLowerCase().includes(term) ||
        String(v.year).includes(term) ||
        `${v.manufacturer} ${v.model}`.toLowerCase().includes(term);

      const matchesManufacturer =
        !selectedManufacturer ||
        v.manufacturer?.toLowerCase() === selectedManufacturer.toLowerCase();

      const matchesCategory =
        !selectedCategory ||
        v.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        !selectedStatus || v.status?.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesManufacturer && matchesCategory && matchesStatus;
    });
  }, [vehicles, searchTerm, selectedManufacturer, selectedCategory, selectedStatus]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedManufacturer || selectedCategory || selectedStatus
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedManufacturer('');
    setSelectedCategory('');
    setSelectedStatus('');
  };

  // Dropdown options for edit form derived strictly from DB vehicles
  const editBrandOptions = useMemo(() => {
    const fromDb = vehicles
      .filter(
        (v) =>
          !watchedEditCategory ||
          (v.category || 'Exterior Of Car').toLowerCase() ===
            watchedEditCategory.toLowerCase()
      )
      .map((v) => v.manufacturer?.trim())
      .filter((m): m is string => Boolean(m));
    return Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
  }, [watchedEditCategory, vehicles]);

  const editModelOptions = useMemo(() => {
    if (!watchedEditManufacturer) return [];
    const fromDb = vehicles
      .filter(
        (v) =>
          v.manufacturer?.toLowerCase() === watchedEditManufacturer.toLowerCase()
      )
      .map((v) => v.model?.trim())
      .filter((m): m is string => Boolean(m));
    return Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
  }, [watchedEditManufacturer, vehicles]);

  const editVariantOptions = useMemo(() => {
    const fromDb = vehicles
      .filter(
        (v) =>
          v.manufacturer?.toLowerCase() ===
            (watchedEditManufacturer || '').toLowerCase() &&
          v.model?.toLowerCase() === (watchedEditModel || '').toLowerCase()
      )
      .map((v) => v.variant?.trim())
      .filter((m): m is string => Boolean(m));
    return Array.from(new Set(fromDb)).sort((a, b) => a.localeCompare(b));
  }, [watchedEditManufacturer, watchedEditModel, vehicles]);

  const editYearOptions = useMemo(() => {
    const years = Array.from(new Set(vehicles.map((v) => String(v.year))));
    return years.sort((a, b) => Number(b) - Number(a));
  }, [vehicles]);

  const inputClass =
    'w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'text-sm font-medium text-neutral-700';

  return (
    <div className="space-y-6">
      {/* ── Edit Modal ── */}
      {editTarget &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isUpdating && setEditTarget(null)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => !isUpdating && setEditTarget(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-neutral-900 mb-1">
                Edit Vehicle & Pattern
              </h3>
              <p className="text-sm text-neutral-500 mb-6">
                Update specifications and cutting pattern for{' '}
                <span className="font-semibold text-neutral-800">
                  {editTarget.manufacturer} {editTarget.model}
                </span>
                .
              </p>

              {editError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 mb-4">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSubmit(handleUpdate)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className={labelClass}>Category *</label>
                    <select
                      {...register('category', { required: true })}
                      className={inputClass}
                    >
                      {VEHICLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Manufacturer / Brand *</label>
                    <Combobox
                      value={watchedEditManufacturer || ''}
                      onChange={(val) => {
                        setValue('manufacturer', val, { shouldValidate: true });
                        setValue('model', '');
                        setValue('variant', '');
                      }}
                      options={editBrandOptions}
                      placeholder="Select brand in DB or type new..."
                      allowCustom={true}
                    />
                    {errors.manufacturer && (
                      <p className="text-xs text-red-500">Required</p>
                    )}
                  </div>

                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Model *</label>
                    <Combobox
                      value={watchedEditModel || ''}
                      onChange={(val) => {
                        setValue('model', val, { shouldValidate: true });
                        setValue('variant', '');
                      }}
                      options={editModelOptions}
                      placeholder="Select model in DB or type new..."
                      disabled={!watchedEditManufacturer}
                      allowCustom={true}
                    />
                    {errors.model && <p className="text-xs text-red-500">Required</p>}
                  </div>

                  {/* Variant */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Variant</label>
                    <Combobox
                      value={watchedEditVariant || ''}
                      onChange={(val) => setValue('variant', val)}
                      options={editVariantOptions}
                      placeholder="Select or enter variant (e.g. GT3 RS)..."
                      allowCustom={true}
                    />
                  </div>

                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Year *</label>
                    <Combobox
                      value={String(watchedEditYear || '')}
                      onChange={(val) =>
                        setValue('year', Number(val) || new Date().getFullYear(), {
                          shouldValidate: true,
                        })
                      }
                      options={editYearOptions}
                      placeholder="Select or enter year..."
                      allowCustom={true}
                    />
                    {errors.year && <p className="text-xs text-red-500">Required</p>}
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className={labelClass}>Status</label>
                    <select {...register('status')} className={inputClass}>
                      <option value="active">Active (Available to installers)</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Pattern Management Section */}
                <div className="pt-4 border-t border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-blue-600" />
                      Attached Cutting Pattern
                    </h4>
                    {editTarget.pattern && (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        Pattern Attached
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Pattern Name
                    </label>
                    <input
                      type="text"
                      value={editPatternName}
                      onChange={(e) => setEditPatternName(e.target.value)}
                      className={inputClass}
                      placeholder="Enter pattern name..."
                    />
                  </div>

                  {/* Pattern File Display / Replace */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Vector Pattern File (.SVG / .DXF)
                    </label>

                    {editPatternFile ? (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-neutral-900">
                            {editPatternFile.name}
                          </span>
                          <span className="text-xs text-neutral-500">
                            ({(editPatternFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditPatternFile(null)}
                          className="text-neutral-400 hover:text-red-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : editTarget.pattern?.files ? (
                      <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-mono font-medium text-neutral-800">
                            {editTarget.pattern.files.svg?.url
                              ? 'Vector SVG Ready'
                              : 'File Attached'}
                          </span>
                          {editTarget.pattern.files.dxf && (
                            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">
                              DXF
                            </span>
                          )}
                          {editTarget.pattern.files.svg && (
                            <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono">
                              SVG
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Replace File
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => editFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer text-center"
                      >
                        <UploadCloud className="w-5 h-5 text-neutral-400 mb-1" />
                        <span className="text-xs font-medium text-neutral-600">
                          Upload SVG or DXF pattern file
                        </span>
                      </div>
                    )}

                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept=".svg,.dxf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditPatternFile(file);
                      }}
                    />
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
      {deleteTarget &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeleteTarget(null)}
            />
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
                  <h3 className="text-xl font-bold text-neutral-900">
                    Delete Vehicle & Pattern
                  </h3>
                  <p className="text-neutral-500 mt-2 text-sm leading-relaxed">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-neutral-800">
                      {deleteTarget.manufacturer} {deleteTarget.model} (
                      {deleteTarget.year})
                    </span>
                    ? This will also remove its associated cutting pattern. This action{' '}
                    <span className="text-red-600 font-medium">
                      cannot be undone
                    </span>
                    .
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </>
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
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Vehicles & Patterns
          </h2>
          <p className="text-neutral-500 mt-1">
            Manage your vehicle database and attached PPF vector patterns in one place.
          </p>
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
              placeholder="Search by brand, model, variant, pattern..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-8 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Categories ({VEHICLE_CATEGORIES.length})</option>
              {VEHICLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Manufacturer Filter */}
            <select
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Brands ({manufacturers.length})</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-neutral-500 hover:text-neutral-900 shrink-0 text-xs h-9 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {!isLoading && (
          <div className="text-xs text-neutral-500 shrink-0 text-right">
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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 min-w-[900px]">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Manufacturer</th>
                <th className="px-6 py-4 font-semibold">Model</th>
                <th className="px-6 py-4 font-semibold">Variant / Trim</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Year</th>
                <th className="px-6 py-4 font-semibold">Cutting Pattern</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm">
                          No vehicles match your search or filter criteria.
                        </p>
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
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {v.manufacturer}
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-800">{v.model}</td>
                    <td className="px-6 py-4">
                      {v.variant ? (
                        <span className="font-medium text-neutral-700">{v.variant}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {v.category || 'Exterior Of Car'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-700">{v.year}</td>
                    <td className="px-6 py-4">
                      {v.pattern ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-900 truncate max-w-[180px]" title={v.pattern.name}>
                            {v.pattern.name}
                          </span>
                          {v.pattern.files?.svg && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-50 text-teal-700 border border-teal-200">
                              SVG
                            </span>
                          )}
                          {v.pattern.files?.dxf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                              DXF
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          No Pattern
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          v.status === 'active'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit vehicle & pattern"
                          onClick={() => setEditTarget(v)}
                        >
                          <FileEdit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete vehicle & pattern"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
