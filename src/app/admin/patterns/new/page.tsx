'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AddPatternPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      vehicleId: '',
      name: '',
      part: '',
      patternType: 'SVG',
      status: 'draft',
      notes: '',
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    // TODO: Connect to backend API: POST /api/patterns with formData
    console.log(data);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/admin/patterns');
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (file.type.includes('svg')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/patterns">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Upload Pattern</h2>
          <p className="text-neutral-400 mt-1">Upload a new cutting pattern file.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Vehicle *</label>
              <select 
                {...register('vehicleId', { required: true })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a Vehicle...</option>
                <option value="1">BMW X5 2024</option>
                <option value="2">Porsche 911 2023</option>
              </select>
              {errors.vehicleId && <p className="text-xs text-red-500">Required</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Pattern Name *</label>
              <input 
                {...register('name', { required: true })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. M-Sport Front Bumper V1"
              />
              {errors.name && <p className="text-xs text-red-500">Required</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Part *</label>
              <input 
                {...register('part', { required: true })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Full Hood"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Status</label>
              <select 
                {...register('status')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="testing">Testing (Beta)</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pattern Upload */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h3 className="text-lg font-medium text-white">Upload File (SVG/DXF)</h3>
          
          <div className="border-2 border-dashed border-neutral-700 rounded-xl p-10 flex flex-col items-center justify-center text-center">
            {filePreview ? (
              <div className="space-y-4 w-full flex flex-col items-center">
                <div className="w-full max-w-sm h-48 bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center p-2">
                  <img src={filePreview} alt="Pattern Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-sm font-medium text-green-400">{fileName} selected</p>
                <label className="cursor-pointer text-sm text-blue-500 hover:text-blue-400">
                  Change File
                  <input type="file" className="hidden" accept=".svg,.dxf" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-300">Drag & Drop or Click to Upload</p>
                  <p className="text-xs text-neutral-500 mt-1">Supports SVG, DXF files (Sanitized automatically)</p>
                </div>
                <label className="inline-block cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm transition-colors mt-2">
                  Select File
                  <input type="file" className="hidden" accept=".svg,.dxf" onChange={handleFileChange} />
                </label>
                {fileName && <p className="text-sm text-neutral-300 mt-2">{fileName}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/admin/patterns">
            <Button type="button" variant="ghost" className="text-neutral-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 gap-2 text-white">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Uploading...' : 'Save Pattern'}
          </Button>
        </div>
      </form>
    </div>
  );
}
