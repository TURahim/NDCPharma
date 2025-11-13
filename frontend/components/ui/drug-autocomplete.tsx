"use client"

/**
 * Drug Autocomplete Component
 * Typeahead search for medications using RxNorm API
 * Features: Keyboard navigation, debounced search, loading states
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { searchDrugs, DrugSearchResult } from '@/lib/rxnorm-client';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DrugAutocompleteProps {
  value: string;
  onChange: (value: string, rxcui?: string) => void;
  onSelect?: (result: DrugSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DrugAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter drug name or NDC",
  disabled = false,
  className,
}: DrugAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DrugSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Debounce the search query to avoid excessive API calls
  const debouncedQuery = useDebounce(value, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      // Only search if we have at least 2 characters
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      // Don't search if it looks like an NDC code (all digits with dashes)
      if (/^\d{5,11}(-\d+)*$/.test(debouncedQuery.trim())) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const searchResults = await searchDrugs(debouncedQuery, 15);
        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
        setSelectedIndex(-1); // Reset selection
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle selection
  const handleSelect = (result: DrugSearchResult) => {
    onChange(result.name, result.rxcui);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onSelect) {
      onSelect(result);
    }

    // Optional: Focus back on input
    inputRef.current?.focus();
  };

  // Clear input
  const handleClear = () => {
    onChange('', undefined);
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Highlight matching substring in result name
  const highlightMatch = (text: string | undefined, query: string) => {
    // Handle undefined/null text
    if (!text) {
      return <span className="text-gray-500">Unknown</span>;
    }

    // Handle empty query
    if (!query) {
      return <span>{text}</span>;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return <span>{text}</span>;
    }

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <span>
        {before}
        <strong className="font-semibold text-blue-600">{match}</strong>
        {after}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, undefined)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg",
            "focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
            "bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors",
            className
          )}
        />

        {/* Loading spinner or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : value && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          <div className="py-1">
            {results.map((result, index) => (
              <button
                key={`${result.rxcui}-${index}`}
                type="button"
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full px-4 py-2.5 text-left transition-colors",
                  "hover:bg-blue-50",
                  selectedIndex === index && "bg-blue-100",
                  "focus:outline-none focus:bg-blue-50"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-sm font-medium text-gray-900">
                    {highlightMatch(result.displayName ?? result.name, debouncedQuery)}
                  </div>
                  <Badge
                    variant={
                      result.confidence === 'exact'
                        ? 'default'
                        : result.confidence === 'high'
                        ? 'secondary'
                        : 'outline'
                    }
                    className={cn(
                      'text-[10px] px-2 py-0.5 font-semibold tracking-wide uppercase',
                      result.confidence === 'exact' && 'bg-green-100 text-green-700 border-green-200',
                      result.confidence === 'high' && 'bg-blue-100 text-blue-700 border-blue-200',
                      result.confidence === 'similar' && 'bg-gray-100 text-gray-600 border-gray-200'
                    )}
                  >
                    {result.confidence === 'exact'
                      ? 'Exact match'
                      : result.confidence === 'high'
                      ? 'Close match'
                      : 'Related'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  RxCUI: {result.rxcui}
                  {typeof result.scoreValue === 'number' && Number.isFinite(result.scoreValue) && (
                    <span className="ml-2 text-gray-400">
                      Score: {Math.round(result.scoreValue)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state (searching but no results) */}
      {isOpen && !isLoading && results.length === 0 && debouncedQuery.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No medications found for &quot;{debouncedQuery}&quot;
          </div>
        </div>
      )}

      {/* Helper text */}
      {!isOpen && !isLoading && value.length > 0 && value.length < 2 && (
        <p className="mt-1 text-xs text-gray-500">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}

