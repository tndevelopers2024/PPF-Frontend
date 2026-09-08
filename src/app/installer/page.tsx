'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, CarFront, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface Vehicle {
  _id: string;
  manufacturer: string;
  model: string;
  generation?: string;
  year: number;
  variant?: string;
  status: string;
}

export default function InstallerSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Fetch vehicles and patterns in parallel
        const [vehiclesRes, patternsRes] = await Promise.all([
          fetch(`${API_URL}/vehicles`, {
            headers: { 'Authorization': `Bearer ${user?.token}` }
          }),
          fetch(`${API_URL}/patterns`, {
            headers: { 'Authorization': `Bearer ${user?.token}` }
          })
        ]);

        if (vehiclesRes.ok) {
          const data: Vehicle[] = await vehiclesRes.json();
          setVehicles(data.filter(v => v.status === 'active'));
        } else {
          setError('Failed to load vehicles');
        }

        if (patternsRes.ok) {
          const patterns: any[] = await patternsRes.json();
          // Count patterns per vehicleId
          const counts: Record<string, number> = {};
          patterns.forEach(p => {
            const vid = typeof p.vehicleId === 'object' ? p.vehicleId._id : p.vehicleId;
            if (vid) counts[vid] = (counts[vid] || 0) + 1;
          });
          setPatternCounts(counts);
        }
      } catch {
        setError('Cannot connect to the server');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.token) fetchData();
  }, [user]);

  const makes = useMemo(() => {
    return Array.from(
      new Set(
        vehicles
          .map((v) => v.manufacturer?.trim())
          .filter((m): m is string => Boolean(m))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const years = useMemo(() => {
    return Array.from(
      new Set(vehicles.map((v) => v.year).filter(Boolean))
    ).sort((a, b) => b - a);
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch = !term ||
        `${v.manufacturer} ${v.model} ${v.year} ${v.generation ?? ''} ${v.variant ?? ''}`
          .toLowerCase()
          .includes(term);

      const matchesMake = !selectedMake || v.manufacturer?.toLowerCase() === selectedMake.toLowerCase();
      const matchesYear = !selectedYear || String(v.year) === selectedYear;

      return matchesSearch && matchesMake && matchesYear;
    });
  }, [vehicles, searchTerm, selectedMake, selectedYear]);

  const hasActiveFilters = Boolean(searchTerm || selectedMake || selectedYear);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMake('');
    setSelectedYear('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">

      {/* Hero Search Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Find Your Next Pattern</h1>
        <p className="text-neutral-500 text-lg max-w-2xl">
          Search the world's most precise PPF cutting patterns.
        </p>

        <div className="w-full max-w-3xl relative mt-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-neutral-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white border-2 border-neutral-200 text-neutral-900 placeholder-neutral-400 rounded-full py-4 pl-14 pr-32 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-lg transition-all shadow-sm"
            placeholder="Search make, model, or year... (e.g. 2023 Porsche 911)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-2 right-2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-6 h-full">
              Search
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
          <select
            aria-label="Filter by make"
            className="bg-white border border-neutral-200 text-neutral-700 rounded-full px-6 py-2.5 text-sm focus:outline-none hover:bg-neutral-50 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500"
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
          >
            <option value="">All Makes</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Filter by year"
            className="bg-white border border-neutral-200 text-neutral-700 rounded-full px-6 py-2.5 text-sm focus:outline-none hover:bg-neutral-50 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="rounded-full border-neutral-200 text-neutral-600 gap-2 hover:bg-neutral-50 shadow-sm"
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <CarFront className="w-5 h-5 text-teal-500" />
          {searchTerm ? `Results for "${searchTerm}"` : 'All Vehicles'}
          {!isLoading && (
            <span className="text-sm font-normal text-neutral-400 ml-1">
              ({filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">{error}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            {hasActiveFilters ? (
              <div className="space-y-3">
                <p>No vehicles match your search or filter criteria.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="rounded-full border-neutral-300 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Clear all filters
                </Button>
              </div>
            ) : (
              'No active vehicles available.'
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <Link key={vehicle._id} href={`/installer/vehicles/${vehicle._id}`}>
                <div className="bg-white border border-neutral-200 hover:border-teal-400 hover:shadow-md rounded-2xl p-6 transition-all cursor-pointer group shadow-sm h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-teal-50 transition-colors border border-neutral-200 shrink-0">
                      <CarFront className="w-6 h-6 text-neutral-400 group-hover:text-teal-500" />
                    </div>
                    <span className="bg-neutral-100 text-neutral-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-neutral-200">
                      {vehicle.year}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900">{vehicle.manufacturer} {vehicle.model}</h4>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {[vehicle.generation, vehicle.variant].filter(Boolean).join(' • ') || 'Standard'}
                  </p>

                  <div className="mt-auto pt-4 border-t border-neutral-100 flex justify-between items-center">
                    <span className="text-sm text-neutral-500">
                      <strong className="text-neutral-900">{patternCounts[vehicle._id] ?? 0}</strong> pattern{(patternCounts[vehicle._id] ?? 0) !== 1 ? 's' : ''} available
                    </span>
                    <span className="text-teal-600 text-sm font-medium group-hover:underline">View Patterns →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
