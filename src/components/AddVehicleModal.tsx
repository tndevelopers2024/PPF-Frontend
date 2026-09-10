'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Plus, FileCode2, UploadCloud, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Combobox from '@/components/ui/combobox';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';
import { VEHICLE_CATEGORIES } from '@/lib/constants';

interface AddVehicleModalProps {
  onSuccess: () => void;
}

export default function AddVehicleModal({ onSuccess }: AddVehicleModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const { user, logout } = useAuth();

  // Pattern upload state
  const [patternName, setPatternName] = useState('');
  const [patternFile, setPatternFile] = useState<File | null>(null);
  const [patternStatus, setPatternStatus] = useState('published');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      category: 'Exterior Of Car',
      manufacturer: '',
      model: '',
      year: new Date().getFullYear(),
      variant: '',
      market: '',
      status: 'active',
      notes: '',
    },
  });

  const watchedCategory = watch('category');
  const watchedManufacturer = watch('manufacturer');
  const watchedModel = watch('model');
  const watchedVariant = watch('variant');
  const watchedYear = watch('year');

  // Load existing vehicles from database to strictly populate dropdowns from DB
  const fetchDbVehicles = () => {
    if (user?.token) {
      fetch(`${API_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
        .then((r) => {
          if (r.status === 401) {
            logout();
            return [];
          }
          return r.ok ? r.json() : [];
        })
        .then((data) => setDbVehicles(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbVehicles();
    }
  }, [isOpen]);

  // Brand / Manufacturer options derived strictly from DB vehicles
  const brandOptions = useMemo(() => {
    const filtered = dbVehicles.filter(
      (v) =>
        !watchedCategory ||
        (v.category || 'Exterior Of Car').toLowerCase() === watchedCategory.toLowerCase()
    );
    const brands = Array.from(
      new Set(filtered.map((v) => v.manufacturer?.trim()).filter(Boolean))
    );
    return brands.sort((a, b) => a.localeCompare(b));
  }, [watchedCategory, dbVehicles]);

  // Model options derived strictly from DB vehicles matching selected brand
  const modelOptions = useMemo(() => {
    if (!watchedManufacturer) return [];
    const filtered = dbVehicles.filter(
      (v) => v.manufacturer?.toLowerCase() === watchedManufacturer.toLowerCase()
    );
    const models = Array.from(
      new Set(filtered.map((v) => v.model?.trim()).filter(Boolean))
    );
    return models.sort((a, b) => a.localeCompare(b));
  }, [watchedManufacturer, dbVehicles]);

  // Variant options derived strictly from DB vehicles matching brand and model
  const variantOptions = useMemo(() => {
    if (!watchedManufacturer || !watchedModel) return [];
    const filtered = dbVehicles.filter(
      (v) =>
        v.manufacturer?.toLowerCase() === watchedManufacturer.toLowerCase() &&
        v.model?.toLowerCase() === watchedModel.toLowerCase()
    );
    const variants = Array.from(
      new Set(filtered.map((v) => v.variant?.trim()).filter(Boolean))
    );
    return variants.sort((a, b) => a.localeCompare(b));
  }, [watchedManufacturer, watchedModel, dbVehicles]);

  // Year options derived strictly from DB vehicles
  const yearOptions = useMemo(() => {
    const years = Array.from(
      new Set(dbVehicles.map((v) => String(v.year)).filter(Boolean))
    );
    return years.sort((a, b) => Number(b) - Number(a));
  }, [dbVehicles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPatternFile(file);
      if (!patternName) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setPatternName(baseName);
      }
    }
  };

  const handleRemoveFile = () => {
    setPatternFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: any) => {
    if (!data.manufacturer?.trim()) {
      setError('Please select or enter a Brand / Manufacturer');
      return;
    }
    if (!data.model?.trim()) {
      setError('Please select or enter a Model');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Create the Vehicle
      const vehiclePayload = {
        category: data.category || 'Exterior Of Car',
        manufacturer: data.manufacturer.trim(),
        model: data.model.trim(),
        variant: data.variant?.trim() || '',
        year: Number(data.year) || new Date().getFullYear(),
        status: data.status || 'active',
        market: data.market || '',
        notes: data.notes || '',
      };

      const resVehicle = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(vehiclePayload),
      });

      if (!resVehicle.ok) {
        let errMessage = 'Failed to create vehicle';
        try {
          const errData = await resVehicle.json();
          errMessage = errData.message || errMessage;
        } catch {
          errMessage = `Server error (${resVehicle.status})`;
        }
        if (resVehicle.status === 401) {
          errMessage = 'Your session has expired or the database was refreshed. Please sign out and sign in again.';
        }
        throw new Error(errMessage);
      }

      const createdVehicle = await resVehicle.json();

      // 2. Direct Pattern Creation (1 Vehicle = 1 Pattern)
      const defaultPatternTitle = `${createdVehicle.manufacturer} ${createdVehicle.model} ${
        createdVehicle.variant ? `(${createdVehicle.variant}) ` : ''
      }Complete Pattern`;

      const patternPayload = {
        vehicleId: createdVehicle._id,
        name: patternName.trim() || defaultPatternTitle,
        part: 'Full Vehicle Kit',
        patternType: createdVehicle.category === 'Window Film' ? 'Window Film' : 'Paint Protection Film',
        status: patternStatus || 'published',
        notes: 'Attached directly via vehicle creation',
      };

      const resPattern = await fetch(`${API_URL}/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(patternPayload),
      });

      if (resPattern.ok) {
        const createdPattern = await resPattern.json();

        // 3. Upload Pattern File (.svg or .dxf) if selected
        if (patternFile && createdPattern?._id) {
          const formData = new FormData();
          formData.append('file', patternFile);

          await fetch(`${API_URL}/patterns/${createdPattern._id}/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user?.token}`,
            },
            body: formData,
          });
        }
      }

      setIsOpen(false);
      reset();
      setPatternFile(null);
      setPatternName('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Cannot connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset();
      setPatternFile(null);
      setPatternName('');
      setError('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm">
        <Plus className="w-4 h-4" />
        Add Vehicle
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white border-neutral-200 p-7">
        <DialogHeader className="border-b border-neutral-100 pb-4">
          <DialogTitle className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            Add New Vehicle & Pattern
          </DialogTitle>
          <DialogDescription className="text-neutral-500 text-sm">
            Select category, enter vehicle details, and attach the cutting pattern directly in one form.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-200 mt-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* 1. Category Selector */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                1
              </span>
              Select Category *
            </label>
            <select
              {...register('category', { required: true })}
              className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-3 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              {VEHICLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Database-driven Combobox Grid: Brand, Model, Variant, Year */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                2
              </span>
              Vehicle Specifications (from DB or Type New)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand / Manufacturer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center justify-between">
                  <span>Brand / Manufacturer *</span>
                  <span className="text-[11px] font-normal text-neutral-400">
                    {brandOptions.length > 0 ? `${brandOptions.length} in DB` : 'Type new'}
                  </span>
                </label>
                <Combobox
                  value={watchedManufacturer}
                  onChange={(val) => {
                    setValue('manufacturer', val, { shouldValidate: true });
                    setValue('model', '');
                    setValue('variant', '');
                  }}
                  options={brandOptions}
                  placeholder="Select brand in DB or type new..."
                  allowCustom={true}
                />
                {errors.manufacturer && (
                  <p className="text-xs text-red-500">Brand is required</p>
                )}
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center justify-between">
                  <span>Model *</span>
                  <span className="text-[11px] font-normal text-neutral-400">
                    {modelOptions.length > 0 ? `${modelOptions.length} in DB` : 'Type new'}
                  </span>
                </label>
                <Combobox
                  value={watchedModel}
                  onChange={(val) => {
                    setValue('model', val, { shouldValidate: true });
                    setValue('variant', '');
                  }}
                  options={modelOptions}
                  placeholder={
                    watchedManufacturer
                      ? `Select model for ${watchedManufacturer} or type new...`
                      : 'Select brand first...'
                  }
                  disabled={!watchedManufacturer}
                  allowCustom={true}
                />
                {errors.model && (
                  <p className="text-xs text-red-500">Model is required</p>
                )}
              </div>

              {/* Variant / Trim */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center justify-between">
                  <span>Variant</span>
                  <span className="text-[11px] font-normal text-neutral-400">
                    {variantOptions.length > 0 ? `${variantOptions.length} in DB` : 'e.g. GT3 RS, Performance'}
                  </span>
                </label>
                <Combobox
                  value={watchedVariant}
                  onChange={(val) => setValue('variant', val)}
                  options={variantOptions}
                  placeholder="Select variant in DB or type new..."
                  allowCustom={true}
                />
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Year *
                </label>
                <Combobox
                  value={String(watchedYear || '')}
                  onChange={(val) =>
                    setValue('year', Number(val) || new Date().getFullYear(), {
                      shouldValidate: true,
                    })
                  }
                  options={yearOptions}
                  placeholder="Select year in DB or type new..."
                  allowCustom={true}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Vehicle Status
                </label>
                <select
                  {...register('status')}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="active">Active (Available in installer catalog)</option>
                  <option value="draft">Draft (Hidden from installers)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Direct Cutting Pattern Section */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  3
                </span>
                Cutting Pattern (Direct Integration)
              </h3>
              <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                1 Vehicle = 1 Pattern
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pattern Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Pattern Name
                </label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder={
                    watchedManufacturer && watchedModel
                      ? `${watchedManufacturer} ${watchedModel} ${
                          watchedVariant ? `(${watchedVariant}) ` : ''
                        }Complete Pattern`
                      : 'e.g. Porsche 911 GT3 RS Complete Pattern'
                  }
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pattern File Upload */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Vector File (.SVG or .DXF)
                </label>
                
                {patternFile ? (
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-blue-300 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                        {patternFile.name.split('.').pop()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 leading-tight">
                          {patternFile.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {(patternFile.size / 1024).toFixed(1)} KB • Vector Cutting File
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 rounded-2xl bg-white hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer text-center group"
                  >
                    <UploadCloud className="w-8 h-8 text-neutral-400 group-hover:text-blue-600 transition-colors mb-2" />
                    <p className="text-sm font-medium text-neutral-700 group-hover:text-blue-600">
                      Click to upload SVG or DXF pattern file
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      DXF files are automatically converted to SVG vector paths
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,.dxf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Pattern Status */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Pattern Status
                </label>
                <select
                  value={patternStatus}
                  onChange={(e) => setPatternStatus(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="published">Published (Ready for cutting jobs)</option>
                  <option value="draft">Draft</option>
                  <option value="testing">Testing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[150px] rounded-xl font-medium"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Vehicle & Pattern
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
