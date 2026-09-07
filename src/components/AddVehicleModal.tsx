'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';

interface AddVehicleModalProps {
  onSuccess: () => void;
}

export default function AddVehicleModal({ onSuccess }: AddVehicleModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      manufacturer: '',
      model: '',
      generation: '',
      year: new Date().getFullYear(),
      variant: '',
      bodyType: '',
      market: '',
      status: 'draft',
      notes: '',
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsOpen(false);
        reset();
        setImagePreview(null);
        onSuccess();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to add vehicle');
      }
    } catch (err) {
      setError('Cannot connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset();
      setImagePreview(null);
      setError('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
        <Plus className="w-4 h-4" />
        Add Vehicle
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-neutral-900">Add New Vehicle</DialogTitle>
          <DialogDescription className="text-neutral-500">
            Create a new vehicle entry in the database.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Manufacturer *</label>
              <input 
                {...register('manufacturer', { required: true })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. BMW"
              />
              {errors.manufacturer && <p className="text-xs text-red-500">Required</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Model *</label>
              <input 
                {...register('model', { required: true })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. X5"
              />
              {errors.model && <p className="text-xs text-red-500">Required</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Generation</label>
              <input 
                {...register('generation')}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. G05"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Year *</label>
              <input 
                type="number"
                {...register('year', { required: true, valueAsNumber: true })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.year && <p className="text-xs text-red-500">Required</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Variant</label>
              <input 
                {...register('variant')}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. xDrive40i"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Body Type</label>
              <select 
                {...register('bodyType')}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Body Type</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Coupe">Coupe</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Truck">Truck</option>
              </select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-neutral-700">Status</label>
              <select 
                {...register('status')}
                className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft (Hidden from installers)</option>
                <option value="active">Active (Published)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <h3 className="text-sm font-medium text-neutral-900 mb-4">Vehicle Image</h3>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="h-32 w-48 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-neutral-400" />
                )}
              </div>
              <div className="pt-2">
                <label className="cursor-pointer bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg text-sm transition-colors font-medium">
                  Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
                <p className="text-xs text-neutral-500 mt-3">Recommended size: 800x600px (JPG/PNG)</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Vehicle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
