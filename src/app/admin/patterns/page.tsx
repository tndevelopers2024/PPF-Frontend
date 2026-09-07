'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Search, 
  FileEdit, 
  Trash, 
  AlertTriangle, 
  X, 
  Save, 
  Upload, 
  CheckCircle2, 
  Filter, 
  RotateCcw,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface Vehicle { 
  _id: string; 
  manufacturer: string; 
  model: string; 
  year: number; 
  variant?: string;
  generation?: string;
}

interface PatternFiles { 
  svg?: { url: string; key: string }; 
  dxf?: { url: string; key: string }; 
}

interface Pattern {
  _id: string;
  name: string;
  part: string;
  patternType?: string;
  status: string;
  version: number;
  vehicleId?: Vehicle | string;
  files?: PatternFiles;
  notes?: string;
}

export default function PatternsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add pattern state & file
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFile, setAddFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit / Update pattern state & file
  const [editTarget, setEditTarget] = useState<Pattern | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Pattern | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useAuth();
  
  const addForm = useForm();
  const editForm = useForm();

  const fetchPatterns = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/patterns', {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) setPatterns(await res.json());
      else setError('Failed to fetch patterns');
    } catch { 
      setError('Cannot connect to the server'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/vehicles', {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) setVehicles(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (user?.token) { 
      fetchPatterns(); 
      fetchVehicles(); 
    }
  }, [user]);

  // Open Edit Modal & Prefill values
  const openEditModal = (pattern: Pattern) => {
    setEditTarget(pattern);
    setEditFile(null);
    setEditError('');

    const vehicleIdVal = typeof pattern.vehicleId === 'object' 
      ? pattern.vehicleId._id 
      : (pattern.vehicleId || '');

    editForm.reset({
      vehicleId: vehicleIdVal,
      name: pattern.name || '',
      part: pattern.part || '',
      patternType: pattern.patternType || 'SVG',
      status: pattern.status || 'published',
      notes: pattern.notes || '',
    });
  };

  // Helper to upload pattern file
  const uploadPatternFile = async (patternId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`http://localhost:5000/api/patterns/${patternId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user?.token}` },
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'File upload failed');
    }
    return res.json();
  };

  // Create Pattern (with optional File Upload in same form)
  const handleAddPattern = async (data: any) => {
    setIsSubmitting(true);
    setAddError('');
    try {
      const res = await fetch('http://localhost:5000/api/patterns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${user?.token}` 
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const createdPattern = await res.json();
        
        // Upload SVG/DXF file if selected
        if (addFile && createdPattern._id) {
          await uploadPatternFile(createdPattern._id, addFile);
        }

        setShowAddModal(false);
        setAddFile(null);
        addForm.reset();
        fetchPatterns();
      } else {
        const err = await res.json();
        setAddError(err.message || 'Failed to create pattern');
      }
    } catch (err: any) { 
      setAddError(err.message || 'Cannot connect to the server'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // Update Pattern Details & optional File Upload in same Edit form
  const handleUpdatePattern = async (data: any) => {
    if (!editTarget) return;
    setIsUpdating(true);
    setEditError('');
    try {
      const res = await fetch(`http://localhost:5000/api/patterns/${editTarget._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${user?.token}` 
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        let updatedPattern = await res.json();

        // Upload new SVG/DXF file if attached
        if (editFile) {
          const uploadRes = await uploadPatternFile(editTarget._id, editFile);
          if (uploadRes.pattern) {
            updatedPattern = uploadRes.pattern;
          }
        }

        // Update local patterns state
        setPatterns(prev => prev.map(p => p._id === editTarget._id ? updatedPattern : p));
        setEditTarget(null);
        setEditFile(null);
        fetchPatterns();
      } else {
        const err = await res.json();
        setEditError(err.message || 'Failed to update pattern');
      }
    } catch (err: any) { 
      setEditError(err.message || 'Error updating pattern'); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  // Delete Pattern
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/patterns/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (res.ok) {
        setPatterns(prev => prev.filter(p => p._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    } catch {}
    finally { 
      setIsDeleting(false); 
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'testing': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'archived': return 'bg-rose-100 text-rose-600 border border-rose-200';
      default: return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
  };

  const getVehicleLabel = (vehicleId: Vehicle | string | undefined) => {
    if (!vehicleId) return '-';
    if (typeof vehicleId === 'object') {
      return `${vehicleId.manufacturer} ${vehicleId.model} ${vehicleId.year}`;
    }
    const found = vehicles.find(v => v._id === vehicleId);
    return found ? `${found.manufacturer} ${found.model} ${found.year}` : vehicleId;
  };

  // Search & Vehicle/Status Filter Logic
  const filteredPatterns = patterns.filter(p => {
    const vehicleObj = typeof p.vehicleId === 'object' ? p.vehicleId : null;
    const vehicleIdStr = vehicleObj ? vehicleObj._id : (typeof p.vehicleId === 'string' ? p.vehicleId : '');
    const vehicleText = vehicleObj ? `${vehicleObj.manufacturer} ${vehicleObj.model} ${vehicleObj.year}` : getVehicleLabel(p.vehicleId);

    const matchesSearch = !searchTerm || (
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.part?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patternType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesVehicle = !selectedVehicleFilter || vehicleIdStr === selectedVehicleFilter;
    const matchesStatus = !selectedStatusFilter || p.status === selectedStatusFilter;

    return matchesSearch && matchesVehicle && matchesStatus;
  });

  const hasActiveFilters = searchTerm || selectedVehicleFilter || selectedStatusFilter;

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedVehicleFilter('');
    setSelectedStatusFilter('');
  };

  const inputClass = "w-full bg-white border border-neutral-300 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const labelClass = "text-sm font-medium text-neutral-700 block mb-1";

  return (
    <div className="space-y-6">

      {/* ── UPDATE / EDIT PATTERN POPUP FORM ── */}
      {editTarget && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !isUpdating && setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-neutral-200">
            <button 
              onClick={() => !isUpdating && setEditTarget(null)} 
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Update Pattern</h3>
                <p className="text-xs text-neutral-500">Edit details and update vector files for {editTarget.name}.</p>
              </div>
            </div>

            {editError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 my-4">
                {editError}
              </div>
            )}

            <form onSubmit={editForm.handleSubmit(handleUpdatePattern)} className="space-y-5 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Vehicle *</label>
                  <select {...editForm.register('vehicleId', { required: true })} className={inputClass}>
                    <option value="">Select a Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.manufacturer} {v.model} ({v.year}) {[v.generation, v.variant].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Pattern Name *</label>
                  <input {...editForm.register('name', { required: true })} className={inputClass} placeholder="e.g. Full Hood" />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Part *</label>
                  <input {...editForm.register('part', { required: true })} className={inputClass} placeholder="e.g. Hood, Bumper" />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Pattern Type</label>
                  <select {...editForm.register('patternType')} className={inputClass}>
                    <option value="SVG">SVG</option>
                    <option value="DXF">DXF</option>
                    <option value="SVG+DXF">SVG + DXF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Status</label>
                  <select {...editForm.register('status')} className={inputClass}>
                    <option value="published">Published</option>
                    <option value="testing">Testing (Beta)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea {...editForm.register('notes')} className={`${inputClass} h-16 resize-none`} placeholder="Optional pattern notes..." />
                </div>
              </div>

              {/* Integrated File Upload Field inside Update Form */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Upload SVG / DXF Pattern File
                  </label>

                  {/* Existing Files Indicator */}
                  <div className="flex items-center gap-2">
                    {editTarget.files?.svg?.url && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                        SVG Attached
                      </span>
                    )}
                    {editTarget.files?.dxf?.url && (
                      <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        DXF Attached
                      </span>
                    )}
                  </div>
                </div>

                <div 
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors bg-white"
                  onClick={() => document.getElementById('edit-pattern-file-input')?.click()}
                >
                  {editFile ? (
                    <div className="space-y-1">
                      <FileCode className="w-7 h-7 text-blue-600 mx-auto" />
                      <p className="font-semibold text-sm text-neutral-900">{editFile.name}</p>
                      <p className="text-xs text-neutral-500">{(editFile.size / 1024).toFixed(1)} KB — Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-neutral-400 mx-auto" />
                      <p className="text-xs font-semibold text-neutral-700">Click to select new SVG or DXF file</p>
                      <p className="text-[11px] text-neutral-400">Replaces existing vector file on submit</p>
                    </div>
                  )}
                </div>

                <input 
                  id="edit-pattern-file-input"
                  type="file"
                  accept=".svg,.dxf"
                  className="hidden"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
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
                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── ADD NEW PATTERN POPUP FORM ── */}
      {showAddModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !isSubmitting && setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-neutral-200">
            <button 
              onClick={() => !isSubmitting && setShowAddModal(false)} 
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Add New Pattern</h3>
                <p className="text-xs text-neutral-500">Create a new cutting pattern and attach vector file.</p>
              </div>
            </div>

            {addError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 my-4">
                {addError}
              </div>
            )}

            <form onSubmit={addForm.handleSubmit(handleAddPattern)} className="space-y-5 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Vehicle *</label>
                  <select {...addForm.register('vehicleId', { required: true })} className={inputClass}>
                    <option value="">Select a Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.manufacturer} {v.model} ({v.year}) {[v.generation, v.variant].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                  {addForm.formState.errors.vehicleId && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Pattern Name *</label>
                  <input {...addForm.register('name', { required: true })} className={inputClass} placeholder="e.g. Full Hood" />
                  {addForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Part *</label>
                  <input {...addForm.register('part', { required: true })} className={inputClass} placeholder="e.g. Hood, Bumper" />
                  {addForm.formState.errors.part && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Pattern Type</label>
                  <select {...addForm.register('patternType')} className={inputClass}>
                    <option value="SVG">SVG</option>
                    <option value="DXF">DXF</option>
                    <option value="SVG+DXF">SVG + DXF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Status</label>
                  <select {...addForm.register('status')} className={inputClass}>
                    <option value="published">Published</option>
                    <option value="testing">Testing (Beta)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea {...addForm.register('notes')} className={`${inputClass} h-16 resize-none`} placeholder="Optional notes..." />
                </div>
              </div>

              {/* Integrated File Upload Field inside Add Form */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                <label className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Attach SVG or DXF Pattern File
                </label>

                <div 
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors bg-white"
                  onClick={() => document.getElementById('add-pattern-file-input')?.click()}
                >
                  {addFile ? (
                    <div className="space-y-1">
                      <FileCode className="w-7 h-7 text-blue-600 mx-auto" />
                      <p className="font-semibold text-sm text-neutral-900">{addFile.name}</p>
                      <p className="text-xs text-neutral-500">{(addFile.size / 1024).toFixed(1)} KB — Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-neutral-400 mx-auto" />
                      <p className="text-xs font-semibold text-neutral-700">Click to select SVG or DXF file</p>
                      <p className="text-[11px] text-neutral-400">File will be automatically uploaded with pattern</p>
                    </div>
                  )}
                </div>

                <input 
                  id="add-pattern-file-input"
                  type="file"
                  accept=".svg,.dxf"
                  className="hidden"
                  onChange={(e) => setAddFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50" 
                  onClick={() => setShowAddModal(false)} 
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save Pattern</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !isDeleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-neutral-200">
            <button onClick={() => !isDeleting && setDeleteTarget(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Delete Pattern</h3>
                <p className="text-neutral-500 mt-2 text-sm leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-neutral-800">"{deleteTarget.name}"</span>?
                  This action <span className="text-rose-600 font-medium">cannot be undone</span>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash className="w-4 h-4 mr-2" />Delete</>}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Patterns</h2>
          <p className="text-neutral-500 mt-0.5 text-sm">Manage PPF cutting patterns, vehicle mappings, and vector files.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-fit shadow-xs" 
          onClick={() => { 
            addForm.reset({ status: 'published', patternType: 'SVG' }); 
            setAddFile(null);
            setAddError(''); 
            setShowAddModal(true); 
          }}
        >
          <Plus className="w-4 h-4" />
          Add Pattern
        </Button>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        {/* Search Function */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search patterns or vehicles..." 
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Vehicle-based Filter */}
        <div className="sm:w-64">
          <select 
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Vehicles ({vehicles.length})</option>
            {vehicles.map(v => (
              <option key={v._id} value={v._id}>
                {v.manufacturer} {v.model} ({v.year})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:w-44">
          <select 
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-white border border-neutral-200 text-neutral-800 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="testing">Testing (Beta)</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters} 
            className="text-neutral-500 hover:text-neutral-900 text-xs gap-1 h-9"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">{error}</div>}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 min-w-[750px]">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200/80 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Pattern Name</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Part</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Files</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
              ) : filteredPatterns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                    {hasActiveFilters ? (
                      <div className="space-y-2">
                        <p>No patterns match your search or filter criteria.</p>
                        <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
                          Clear Filters
                        </Button>
                      </div>
                    ) : (
                      'No patterns found. Click "Add Pattern" to create one.'
                    )}
                  </td>
                </tr>
              ) : filteredPatterns.map((p) => (
                <tr key={p._id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-neutral-900">{p.name}</td>
                  <td className="px-6 py-4 font-medium text-neutral-700">{getVehicleLabel(p.vehicleId)}</td>
                  <td className="px-6 py-4">{p.part}</td>
                  <td className="px-6 py-4">{p.patternType || '-'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-neutral-500">v{p.version}.0</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(p.status)}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {p.files?.svg?.url ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> SVG
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">No SVG</span>
                      )}
                      {p.files?.dxf?.url && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> DXF
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-1">
                      {/* Update / Edit Pattern Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" 
                        title="Edit pattern & upload files" 
                        onClick={() => openEditModal(p)}
                      >
                        <FileEdit className="w-4 h-4" />
                      </Button>

                      {/* Delete Pattern Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg" 
                        title="Delete pattern" 
                        onClick={() => setDeleteTarget(p)}
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
