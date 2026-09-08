'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Scissors, Check, Info, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { API_URL, getAssetUrl } from '@/lib/api';

export default function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { setQueuedPatterns } = useWorkspaceStore();
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [patternGroups, setPatternGroups] = useState<{ group: string; patterns: any[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [error, setError] = useState('');
  const [inGarage, setInGarage] = useState(false);
  const [isAddingToGarage, setIsAddingToGarage] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchVehicle = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/vehicles/${id}`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        if (res.ok) {
          setVehicle(await res.json());
        } else {
          setError('Vehicle not found');
        }
      } catch {
        setError('Cannot connect to the server');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.token && id) fetchVehicle();
  }, [id, user]);

  useEffect(() => {
    if (!id || !user?.token) return;
    setPatternsLoading(true);
    fetch(`${API_URL}/patterns?vehicleId=${id}`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then((patterns: any[]) => {
        // Group by part name
        const map = new Map<string, any[]>();
        patterns.forEach(p => {
          const key = p.part || 'Other';
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
        });
        setPatternGroups(Array.from(map.entries()).map(([group, patterns]) => ({ group, patterns })));
      })
      .catch(() => {})
      .finally(() => setPatternsLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (user?.token && id) {
      fetch(`${API_URL}/garage/check/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
        .then((r) => (r.ok ? r.json() : { inGarage: false }))
        .then((data) => setInGarage(Boolean(data.inGarage)))
        .catch(() => {});
    }
  }, [id, user]);

  const handleAddToGarage = async () => {
    if (!user?.token || !id) return;
    setIsAddingToGarage(true);
    try {
      const res = await fetch(`${API_URL}/garage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          vehicleId: id,
          selectedPackage: 'Full Front PPF',
          status: 'in_shop',
        }),
      });
      if (res.ok) {
        setInGarage(true);
      }
    } catch {
    } finally {
      setIsAddingToGarage(false);
    }
  };

  const togglePattern = (id: string) => {
    setSelectedPatterns(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error || 'Vehicle not found'}</p>
        <Link href="/installer" className="text-teal-600 text-sm mt-4 inline-block hover:underline">← Back to search</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/installer">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-600 hover:text-neutral-900 rounded-full bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex flex-wrap items-center gap-3">
              {vehicle.year} {vehicle.manufacturer} {vehicle.model}
              {(vehicle.generation || vehicle.variant) && (
                <span className="text-base font-normal text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                  {[vehicle.generation, vehicle.variant].filter(Boolean).join(' • ')}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {inGarage ? (
              <Link href="/installer/garage">
                <Button
                  variant="outline"
                  className="border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full gap-2 text-xs h-10 px-4 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  In My Garage
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={handleAddToGarage}
                disabled={isAddingToGarage}
                className="border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-full gap-2 text-xs h-10 px-4 shadow-2xs"
              >
                <Car className="w-3.5 h-3.5 text-neutral-500" />
                {isAddingToGarage ? 'Adding...' : 'Add to Garage'}
              </Button>
            )}

            {selectedPatterns.length > 0 && (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 px-4 py-1.5 rounded-full">
                <span className="text-teal-700 font-medium text-xs">{selectedPatterns.length} Patterns Selected</span>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-full text-xs h-8 px-3"
                  onClick={() => {
                    setQueuedPatterns(selectedPatterns, id);
                    router.push('/workspace');
                  }}
                >
                  <Scissors className="w-3.5 h-3.5 mr-1.5" />
                  Send to Cut Workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Vehicle Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
            {vehicle.image ? (
              <div className="h-56 bg-neutral-100 relative overflow-hidden">
                <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
              </div>
            ) : (
              <div className="h-40 bg-neutral-50 flex items-center justify-center border-b border-neutral-200">
                <span className="text-neutral-300 text-sm">No image available</span>
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">Vehicle Details</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Manufacturer', value: vehicle.manufacturer },
                  { label: 'Model', value: vehicle.model },
                  { label: 'Year', value: vehicle.year },
                  { label: 'Generation', value: vehicle.generation || '-' },
                  { label: 'Variant', value: vehicle.variant || '-' },
                  { label: 'Body Type', value: vehicle.bodyType || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-neutral-500">{label}</span>
                    <span className="text-neutral-800 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pattern Selection */}
        <div className="lg:col-span-2 space-y-6">
          {patternsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : patternGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
              <p className="text-neutral-400 text-sm">No patterns available for this vehicle yet.</p>
            </div>
          ) : patternGroups.map((group, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
              <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-bold text-neutral-900">{group.group}</h3>
                <span className="text-xs text-neutral-500">{group.patterns.length} pattern{group.patterns.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-neutral-100">
                {group.patterns.map((pattern) => {
                  const isSelected = selectedPatterns.includes(pattern._id);
                  const svgPath = pattern.files?.svg?.url || (pattern.files?.dxf?.url ? `${pattern.files.dxf.url}.svg` : null);
                  const previewUrl = getAssetUrl(svgPath);
                  const fileType = pattern.files?.dxf ? 'DXF' : (pattern.files?.svg ? 'SVG' : null);
                  return (
                    <div
                      key={pattern._id}
                      className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50' : 'hover:bg-neutral-50'
                      }`}
                      onClick={() => togglePattern(pattern._id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-neutral-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-teal-700' : 'text-neutral-900'}`}>{pattern.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {fileType && (
                              <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono font-medium">{fileType}</span>
                            )}
                            {pattern.patternType && pattern.patternType !== fileType && (
                              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">{pattern.patternType}</span>
                            )}
                            {pattern.status === 'testing' && (
                              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Testing (Beta)
                              </span>
                            )}
                            {pattern.status === 'draft' && (
                              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">Draft</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {previewUrl ? (
                          <div className="w-20 h-14 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-sm">
                            <img
                              src={previewUrl}
                              alt={pattern.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-14 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                            No Prev
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
