'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Plus } from 'lucide-react';

export interface ComboboxOption {
  label: string;
  value: string;
  hint?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Type to search or select...',
  disabled = false,
  allowCustom = false,
  className = '',
  inputClassName = '',
  id,
  name,
  ariaLabel,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize options to ComboboxOption objects
  const normalizedOptions = useMemo<ComboboxOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }, [options]);

  // Keep query in sync when value changes from outside, unless open
  useEffect(() => {
    if (!isOpen) {
      const match = normalizedOptions.find(
        (o) => o.value.toLowerCase() === (value || '').toLowerCase()
      );
      setSearchQuery(match ? match.label : value || '');
    }
  }, [value, normalizedOptions, isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.hint && opt.hint.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Check if current search query matches an existing option exactly
  const hasExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedOptions.some(
      (opt) => opt.value.toLowerCase() === q || opt.label.toLowerCase() === q
    );
  }, [normalizedOptions, searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If allowCustom and query has text, commit it on blur
        if (allowCustom && searchQuery.trim() && searchQuery.trim() !== value) {
          onChange(searchQuery.trim());
        } else {
          // Revert to value label
          const match = normalizedOptions.find(
            (o) => o.value.toLowerCase() === (value || '').toLowerCase()
          );
          setSearchQuery(match ? match.label : value || '');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustom, searchQuery, value, normalizedOptions, onChange]);

  const handleSelect = (val: string) => {
    onChange(val);
    const match = normalizedOptions.find((o) => o.value.toLowerCase() === val.toLowerCase());
    setSearchQuery(match ? match.label : val);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        const total = filteredOptions.length + (allowCustom && searchQuery && !hasExactMatch ? 1 : 0);
        setHighlightedIndex((prev) => (prev + 1) % Math.max(total, 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const total = filteredOptions.length + (allowCustom && searchQuery && !hasExactMatch ? 1 : 0);
        setHighlightedIndex((prev) => (prev - 1 + total) % Math.max(total, 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (allowCustom && searchQuery.trim()) {
          handleSelect(searchQuery.trim());
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          name={name}
          aria-label={ariaLabel || placeholder}
          type="text"
          disabled={disabled}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-white border border-neutral-300 rounded-xl px-4 py-2.5 pr-16 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50 disabled:bg-neutral-100 disabled:cursor-not-allowed ${inputClassName}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1 text-neutral-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 hover:text-neutral-700 rounded-full transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-teal-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-1.5 w-full bg-white border border-neutral-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto py-1.5 text-sm animate-in fade-in-50 zoom-in-95">
          <ul ref={listRef} role="listbox" className="divide-y divide-neutral-50">
            {allowCustom && searchQuery.trim() && !hasExactMatch && (
              <li
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(searchQuery.trim())}
                className="px-3.5 py-2.5 cursor-pointer flex items-center gap-2 bg-teal-50/70 hover:bg-teal-100/70 text-teal-800 font-semibold border-b border-teal-100 transition-colors"
              >
                <Plus className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">
                  Add &quot;{searchQuery.trim()}&quot;
                </span>
              </li>
            )}

            {filteredOptions.length === 0 && !allowCustom ? (
              <li className="px-4 py-3 text-neutral-400 text-xs text-center">
                No matching options found
              </li>
            ) : filteredOptions.length === 0 && allowCustom && !searchQuery.trim() ? (
              <li className="px-4 py-3 text-neutral-400 text-xs text-center">
                Start typing to add a custom value or search
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = (value || '').toLowerCase() === opt.value.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : isHighlighted
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="text-[11px] text-neutral-400 font-normal truncate">
                          {opt.hint}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0 stroke-[2.5]" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
