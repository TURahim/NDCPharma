/**
 * RxNorm API Client for Drug Search Autocomplete
 * National Library of Medicine RxNorm API
 * Documentation: https://rxnav.nlm.nih.gov/APIs.html
 */

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

export interface DrugSearchResult {
  rxcui: string;
  name: string;
  synonym?: string;
  termType?: string;
  score?: string;
}

export interface RxNormApproximateResponse {
  approximateGroup?: {
    candidate?: Array<{
      rxcui: string;
      name: string;
      score: string;
    }>;
  };
}

/**
 * Search for drugs by name prefix (fuzzy/approximate match)
 * Perfect for autocomplete typeahead
 * 
 * @param query - Search term (e.g., "lisin", "metf")
 * @param maxResults - Maximum number of results (default: 15)
 * @returns Array of drug search results, sorted alphabetically
 */
export async function searchDrugs(
  query: string,
  maxResults: number = 15
): Promise<DrugSearchResult[]> {
  // Validation
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const trimmedQuery = query.trim();
    const url = `${RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(trimmedQuery)}&maxEntries=${maxResults}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('RxNorm API error:', response.status, response.statusText);
      return [];
    }

    const data: RxNormApproximateResponse = await response.json();

    // Parse response
    const candidates = data.approximateGroup?.candidate || [];
    
    if (candidates.length === 0) {
      return [];
    }

    // Transform to our interface
    const results: DrugSearchResult[] = candidates.map((candidate) => ({
      rxcui: candidate.rxcui,
      name: candidate.name,
      score: candidate.score,
    }));

    // Sort alphabetically by name (with null safety)
    results.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    return results;
  } catch (error) {
    // Graceful degradation - return empty array on any error
    console.error('Error searching drugs:', error);
    return [];
  }
}

/**
 * Get drug properties by RxCUI
 * Useful for getting additional details after selection
 * 
 * @param rxcui - RxNorm Concept Unique Identifier
 * @returns Drug properties or null if not found
 */
export async function getDrugProperties(rxcui: string): Promise<{
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string;
  language?: string;
} | null> {
  try {
    const url = `${RXNORM_BASE_URL}/rxcui/${rxcui}/properties.json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const properties = data.properties;

    if (!properties) {
      return null;
    }

    return {
      rxcui: properties.rxcui,
      name: properties.name,
      synonym: properties.synonym,
      tty: properties.tty,
      language: properties.language,
    };
  } catch (error) {
    console.error('Error fetching drug properties:', error);
    return null;
  }
}

/**
 * Get spelling suggestions for a potentially misspelled drug name
 * Useful for "Did you mean...?" functionality
 * 
 * @param name - Drug name (possibly misspelled)
 * @returns Array of spelling suggestions
 */
export async function getSpellingSuggestions(name: string): Promise<string[]> {
  if (!name || name.trim().length < 2) {
    return [];
  }

  try {
    const url = `${RXNORM_BASE_URL}/spellingsuggestions.json?name=${encodeURIComponent(name.trim())}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const suggestions = data.suggestionGroup?.suggestionList?.suggestion || [];

    return suggestions;
  } catch (error) {
    console.error('Error getting spelling suggestions:', error);
    return [];
  }
}

