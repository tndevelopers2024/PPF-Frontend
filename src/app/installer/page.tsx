'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CarFront, 
  RotateCcw, 
  Scissors, 
  Check, 
  ArrowRight, 
  ExternalLink, 
  Loader2,
  CheckCircle2,
  FileCode,
  SlidersHorizontal,
  FileCheck2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Combobox from '@/components/ui/combobox';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { API_URL, getAssetUrl } from '@/lib/api';
import { VEHICLE_CATEGORIES } from '@/lib/constants';

interface Vehicle {
  _id: string;
  manufacturer: string;
  model: string;
  year: number;
  variant?: string;
  category?: string;
  image?: { url?: string } | string;
  status: string;
}

interface Pattern {
  _id: string;
  name: string;
  part?: string;
  patternType?: string;
  status?: string;
  files?: {
    svg?: { url?: string };
    dxf?: { url?: string };
  };
}

export default function InstallerSearchPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setQueuedPatterns } = useWorkspaceStore();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [error, setError] = useState('');

  // 5 Cascading Dropdown States
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Pattern pulling state (strictly 1 pattern per car)
  const [isPullingPattern, setIsPullingPattern] = useState(false);
  const [vehiclePattern, setVehiclePattern] = useState<Pattern | null>(null);

  // Fetch all active vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoadingVehicles(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/vehicles`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });

        if (res.ok) {
          const data: Vehicle[] = await res.json();
          setVehicles(data.filter((v) => v.status === 'active'));
        } else if (res.status === 401) {
          logout();
        } else {
          setError('Failed to load vehicles catalog');
        }
      } catch {
        setError('Cannot connect to the server');
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    if (user?.token) {
      fetchVehicles();
    }
  }, [user]);

  // Vehicles filtered by selected category
  const vehiclesByCategory = useMemo(() => {
    if (!selectedCategory) return vehicles;
    return vehicles.filter(
      (v) => (v.category || 'Exterior Of Car').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [vehicles, selectedCategory]);

  // 1. Available Makes (sorted)
  const availableMakes = useMemo(() => {
    const makesSet = new Set(
      vehiclesByCategory
        .map((v) => v.manufacturer?.trim())
        .filter((m): m is string => Boolean(m))
    );
    return Array.from(makesSet).sort((a, b) => a.localeCompare(b));
  }, [vehiclesByCategory]);

  // 2. Available Models for selected Make
  const availableModels = useMemo(() => {
    if (!selectedMake) return [];
    const modelsSet = new Set(
      vehiclesByCategory
        .filter((v) => v.manufacturer?.toLowerCase() === selectedMake.toLowerCase())
        .map((v) => v.model?.trim())
        .filter((m): m is string => Boolean(m))
    );
    return Array.from(modelsSet).sort((a, b) => a.localeCompare(b));
  }, [vehiclesByCategory, selectedMake]);

  // 3. Available Variants for selected Make + Model
  const availableVariants = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    const variantsSet = new Set(
      vehiclesByCategory
        .filter(
          (v) =>
            v.manufacturer?.toLowerCase() === selectedMake.toLowerCase() &&
            v.model?.toLowerCase() === selectedModel.toLowerCase()
        )
        .map((v) => v.variant?.trim() || 'Standard')
    );
    return Array.from(variantsSet).sort((a, b) => a.localeCompare(b));
  }, [vehiclesByCategory, selectedMake, selectedModel]);

  // 4. Available Years for selected Make + Model (+ optionally Variant)
  const availableYears = useMemo(() => {
    if (!selectedMake || !selectedModel) return [];
    const filtered = vehiclesByCategory.filter(
      (v) =>
        v.manufacturer?.toLowerCase() === selectedMake.toLowerCase() &&
        v.model?.toLowerCase() === selectedModel.toLowerCase() &&
        (!selectedVariant ||
          (v.variant?.trim() || 'Standard').toLowerCase() === selectedVariant.toLowerCase())
    );
    const yearsSet = new Set(filtered.map((v) => v.year).filter(Boolean));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [vehiclesByCategory, selectedMake, selectedModel, selectedVariant]);

  // Auto-fill variant if only 1 variant exists
  useEffect(() => {
    if (availableVariants.length === 1 && !selectedVariant) {
      setSelectedVariant(availableVariants[0]);
    }
  }, [availableVariants, selectedVariant]);

  // Auto-fill year if only 1 year exists for the selection
  useEffect(() => {
    if (availableYears.length === 1 && !selectedYear) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  // The actively resolved Vehicle object
  const activeVehicle = useMemo(() => {
    if (!selectedMake || !selectedModel || !selectedYear) return null;
    return (
      vehiclesByCategory.find((v) => {
        const matchesMake = v.manufacturer?.toLowerCase() === selectedMake.toLowerCase();
        const matchesModel = v.model?.toLowerCase() === selectedModel.toLowerCase();
        const matchesYear = String(v.year) === String(selectedYear);
        const matchesVariant =
          !selectedVariant ||
          (v.variant?.trim() || 'Standard').toLowerCase() === selectedVariant.toLowerCase();
        return matchesMake && matchesModel && matchesYear && matchesVariant;
      }) || null
    );
  }, [vehiclesByCategory, selectedMake, selectedModel, selectedVariant, selectedYear]);

  // Pull the single pattern whenever activeVehicle changes
  useEffect(() => {
    if (!activeVehicle?._id || !user?.token) {
      setVehiclePattern(null);
      return;
    }

    let isMounted = true;
    setIsPullingPattern(true);

    fetch(`${API_URL}/patterns?vehicleId=${activeVehicle._id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((patterns: Pattern[]) => {
        if (!isMounted) return;
        if (patterns && patterns.length > 0) {
          setVehiclePattern(patterns[0]);
        } else {
          setVehiclePattern(null);
        }
      })
      .catch((err) => {
        console.error('Failed to pull vehicle pattern:', err);
        if (isMounted) setVehiclePattern(null);
      })
      .finally(() => {
        if (isMounted) setIsPullingPattern(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeVehicle?._id, user?.token]);

  // Handlers for cascading dropdowns
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedYear('');
    setVehiclePattern(null);
  };

  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedYear('');
    setVehiclePattern(null);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedVariant('');
    setSelectedYear('');
    setVehiclePattern(null);
  };

  const handleVariantChange = (variant: string) => {
    setSelectedVariant(variant);
    setVehiclePattern(null);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setVehiclePattern(null);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setSelectedMake('');
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedYear('');
    setVehiclePattern(null);
  };

  // Continue action: Queue the vehicle's single pattern and open the editor
  const handleContinueToEditor = () => {
    if (!vehiclePattern || !activeVehicle) return;

    // Place the single pattern into workspace queue
    setQueuedPatterns([vehiclePattern._id], activeVehicle._id);

    router.push('/workspace');
  };

  const patternFileType = vehiclePattern?.files?.dxf
    ? 'DXF'
    : vehiclePattern?.files?.svg
    ? 'SVG'
    : null;

  const patternPreviewSvg =
    vehiclePattern?.files?.svg?.url ||
    (vehiclePattern?.files?.dxf?.url ? `${vehiclePattern.files.dxf.url}.svg` : null);
  const previewUrl = patternPreviewSvg ? getAssetUrl(patternPreviewSvg) : null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold uppercase tracking-wider mb-1">
          <CarFront className="w-3.5 h-3.5" />
          Vehicle Pattern Selector
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
          Find Your Vehicle Pattern
        </h1>
        <p className="text-neutral-500 text-base max-w-xl mx-auto">
          Select category, make, model, variant, and year to pull its cut pattern directly into the editor.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 text-center">
          {error}
        </div>
      )}

      {/* Main Dropdown Selector Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm space-y-8 relative overflow-visible">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Select Vehicle Specification</h2>
              <p className="text-xs text-neutral-500">Pick cascading dropdowns to load the car's pattern</p>
            </div>
          </div>

          {(selectedCategory || selectedMake || selectedModel || selectedVariant || selectedYear) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-neutral-500 hover:text-neutral-900 gap-1.5 text-xs rounded-full"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Selection
            </Button>
          )}
        </div>

        {/* 5 Cascading Dropdowns: Category -> Make -> Model -> Variant -> Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold inline-flex items-center justify-center">1</span>
              Category
            </label>
            <Combobox
              value={selectedCategory}
              onChange={(val) => handleCategoryChange(val === 'All Categories' ? '' : val)}
              options={['All Categories', ...VEHICLE_CATEGORIES]}
              placeholder="Search category..."
              disabled={isLoadingVehicles}
            />
          </div>

          {/* 2. Make / Brand */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold inline-flex items-center justify-center">2</span>
              Vehicle Make
            </label>
            <Combobox
              value={selectedMake}
              onChange={handleMakeChange}
              options={availableMakes}
              placeholder={availableMakes.length === 0 ? 'No makes found' : 'Search make...'}
              disabled={isLoadingVehicles || availableMakes.length === 0}
            />
          </div>

          {/* 3. Model */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold inline-flex items-center justify-center">3</span>
              Model
            </label>
            <Combobox
              value={selectedModel}
              onChange={handleModelChange}
              options={availableModels}
              placeholder={!selectedMake ? 'Select make first' : 'Search model...'}
              disabled={!selectedMake || availableModels.length === 0}
            />
          </div>

          {/* 4. Variant / Trim */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold inline-flex items-center justify-center">4</span>
              Variant / Trim
            </label>
            <Combobox
              value={selectedVariant}
              onChange={handleVariantChange}
              options={availableVariants}
              placeholder={!selectedModel ? 'Select model first' : 'Search variant...'}
              disabled={!selectedModel || availableVariants.length === 0}
            />
          </div>

          {/* 5. Year */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold inline-flex items-center justify-center">5</span>
              Year
            </label>
            <Combobox
              value={selectedYear}
              onChange={handleYearChange}
              options={availableYears.map(String)}
              placeholder={!selectedModel ? 'Select model first' : 'Search year...'}
              disabled={!selectedModel || availableYears.length === 0}
            />
          </div>
        </div>

        {/* Pulling pattern feedback */}
        {isPullingPattern && (
          <div className="flex items-center justify-center gap-3 py-6 bg-neutral-50 rounded-2xl border border-neutral-200">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            <span className="text-sm font-medium text-neutral-700">
              Pulling pattern for {selectedYear} {selectedMake} {selectedModel} {selectedVariant ? `(${selectedVariant})` : ''}...
            </span>
          </div>
        )}

        {/* Pulled Single Pattern & Details Section */}
        {activeVehicle && !isPullingPattern && (
          <div className="space-y-6 pt-6 border-t border-neutral-100">
            {/* Vehicle & Pattern Pulled Card */}
            {vehiclePattern ? (
              <div className="p-6 rounded-3xl bg-teal-50/60 border-2 border-teal-300 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0">
                      <FileCheck2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                          Pattern Ready
                        </span>
                        {patternFileType && (
                          <span className="text-xs font-mono font-bold text-neutral-700 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                            {patternFileType}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-neutral-900 text-xl mt-1">
                        {vehiclePattern.name}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {activeVehicle.year} {activeVehicle.manufacturer} {activeVehicle.model}
                        {activeVehicle.variant && (
                          <span> • {activeVehicle.variant}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {previewUrl && (
                    <div className="w-24 h-16 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-sm shrink-0">
                      <img
                        src={previewUrl}
                        alt={vehiclePattern.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-teal-200/60 flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5 text-teal-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    1:1 Scale PPF cut pattern loaded for this car
                  </span>
                  <span className="text-teal-700 font-medium">
                    {vehiclePattern.part || 'Full Vehicle Kit'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
                <span>No cutting pattern is currently uploaded for this vehicle.</span>
                <span className="text-xs text-amber-600">Contact admin to attach pattern vector</span>
              </div>
            )}

            {/* Action Buttons: Continue to Editor / View Details */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <Link
                href={`/installer/vehicles/${activeVehicle._id}`}
                className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                View Vehicle Specs & Parts Breakdown
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <Button
                onClick={handleContinueToEditor}
                disabled={!vehiclePattern}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 h-auto rounded-xl shadow-lg shadow-teal-600/20 gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Scissors className="w-4 h-4" />
                Continue to Pattern Editor
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3 Step Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-100">
            1
          </div>
          <h3 className="font-bold text-neutral-900 text-base">Select Car</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Pick the category, make, model, variant, and year directly from the cascading dropdowns.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-100">
            2
          </div>
          <h3 className="font-bold text-neutral-900 text-base">Pull Pattern</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            The car's unique cutting pattern template is automatically pulled from the database.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-100">
            3
          </div>
          <h3 className="font-bold text-neutral-900 text-base">Open in Editor</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Click Continue to arrange, nest, and send to your cutting plotter.
          </p>
        </div>
      </div>
    </div>
  );
}
