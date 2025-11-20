"use client"

/**
 * Step 1: Drug Search
 * User searches for medication by name or RxCUI
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWorkflow } from '@/lib/workflow-context';
import { searchDrug, APIError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'ndc_recent_searches';
const MAX_RECENT_SEARCHES = 10;

interface RecentSearch {
  drugName: string;
  rxcui: string;
  timestamp: number;
}

export function DrugSearchStep() {
  const { state, dispatch, goNext } = useWorkflow();
  const { getIdToken } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState(state.drugSearch?.searchTerm || '');
  const [strengthFilter, setStrengthFilter] = useState<string>('');
  const [availableStrengths, setAvailableStrengths] = useState<string[]>([]);
  const [showStrengthFilter, setShowStrengthFilter] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  // Load recent searches on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RecentSearch[];
          // Filter out old searches (> 30 days)
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          const recent = parsed.filter(s => s.timestamp > thirtyDaysAgo);
          setRecentSearches(recent.slice(0, MAX_RECENT_SEARCHES));
        }
      } catch (e) {
        console.warn('Failed to load recent searches:', e);
      }
    }
  }, []);
  
  // Save to recent searches
  const saveToRecentSearches = (drugName: string, rxcui: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const newSearch: RecentSearch = {
        drugName,
        rxcui,
        timestamp: Date.now(),
      };
      
      // Remove duplicates and add new search
      const updated = [
        newSearch,
        ...recentSearches.filter(s => s.rxcui !== rxcui),
      ].slice(0, MAX_RECENT_SEARCHES);
      
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.warn('Failed to save recent search:', e);
    }
  };
  
  const handleSearch = async (searchValue?: string, useStrength: boolean = false) => {
    const term = searchValue || searchTerm;
    if (!term.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const idToken = await getIdToken();
      
      // Call search API
      const response = await searchDrug({
        drugName: term.trim(),
        strength: useStrength ? strengthFilter : undefined,
        includeStrengths: !useStrength, // Get available strengths on first search
      }, idToken);
      
      if (response.success && response.data) {
        // Set drug search data
        dispatch({
          type: 'SET_DRUG_SEARCH',
          payload: {
            searchTerm: term.trim(),
            rxcui: response.data.drug.rxcui,
            drugName: response.data.drug.name,
            strength: response.data.drug.strength,
            dosageForm: response.data.drug.dosageForm,
            timestamp: Date.now(),
          },
        });
        
        // Set available packages
        dispatch({
          type: 'SET_AVAILABLE_PACKAGES',
          payload: response.data.packages,
        });
        
        // Save to recent searches
        saveToRecentSearches(response.data.drug.name, response.data.drug.rxcui);
        
        // Set available strengths if returned
        if (response.data.availableStrengths && response.data.availableStrengths.length > 1) {
          setAvailableStrengths(response.data.availableStrengths);
          setShowStrengthFilter(true);
          
          // If no strength filter applied yet, don't auto-advance
          if (!useStrength && response.data.availableStrengths.length > 1) {
            // Show message to select strength
            return;
          }
        }
        
        // Auto-advance to next step if packages found
        if (response.data.packages.length > 0) {
          goNext();
        }
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
        
        // Show helpful suggestions for specific errors
        if (err.code === 'DRUG_NOT_FOUND') {
          setError(`${err.message}\n\nTry: generic name, brand name, or RxCUI`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleRecentSearchClick = (search: RecentSearch) => {
    setSearchTerm(search.drugName);
    handleSearch(search.drugName);
  };
  
  const handleStrengthFilterApply = () => {
    if (strengthFilter) {
      handleSearch(searchTerm, true);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Search for Medication</h2>
        <p className="text-gray-600 mt-1">
          Enter the drug name or RxCUI to begin
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Search input */}
        <div className="space-y-2">
          <Label htmlFor="drug-search">Drug Name or RxCUI</Label>
          <div className="flex gap-2">
            <Input
              id="drug-search"
              type="text"
              placeholder="e.g., Lisinopril, Metformin, or 314076"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
              disabled={isSearching}
              className="flex-1"
            />
            <Button
              onClick={() => handleSearch()}
              disabled={!searchTerm.trim() || isSearching}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Strength filter (shown if multiple strengths available) */}
        {showStrengthFilter && availableStrengths.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  Multiple strengths available
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Select a specific strength to filter packages, or continue to view all
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="strength-filter" className="text-sm">Strength</Label>
                <Select value={strengthFilter} onValueChange={setStrengthFilter}>
                  <SelectTrigger id="strength-filter">
                    <SelectValue placeholder="Select strength" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStrengths.map((strength) => (
                      <SelectItem key={strength} value={strength}>
                        {strength}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStrengthFilterApply}
                disabled={!strengthFilter || isSearching}
                size="sm"
              >
                Apply Filter
              </Button>
              <Button
                onClick={() => goNext()}
                variant="outline"
                size="sm"
              >
                View All
              </Button>
            </div>
          </div>
        )}
        
        {/* Success message */}
        {state.drugSearch && !isSearching && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <span className="font-semibold">Found:</span> {state.drugSearch.drugName}
              {state.drugSearch.rxcui && ` (RxCUI: ${state.drugSearch.rxcui})`}
              {state.availablePackages && (
                <span className="ml-2">
                  — {state.availablePackages.length} package{state.availablePackages.length !== 1 ? 's' : ''} available
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Recent searches */}
        {recentSearches.length > 0 && !isSearching && !state.drugSearch && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent Searches
            </Label>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((search) => (
                <button
                  key={search.rxcui}
                  onClick={() => handleRecentSearchClick(search)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                >
                  {search.drugName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Tip:</span> Search by generic name for best results (e.g., "lisinopril" instead of "Prinivil")
        </p>
      </div>
    </div>
  );
}

