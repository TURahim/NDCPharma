/**
 * RxNorm API Client for Drug Search Autocomplete
 * National Library of Medicine RxNorm API
 * Documentation: https://rxnav.nlm.nih.gov/APIs.html
 * 
 * Strategy:
 * - Filter to specific clinical drug forms (with strength/dosage)
 * - Exclude generic ingredients (IN, PIN)
 * - Prioritize exact name matches
 */

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

export type MatchConfidence = 'exact' | 'high' | 'similar';

// Term Types (TTY) to include - these have strength/dosage information
const CLINICAL_DRUG_TYPES = new Set([
  'SCD',  // Semantic Clinical Drug (e.g., "Metformin 500 MG Oral Tablet")
  'SBD',  // Semantic Branded Drug (e.g., "Glucophage 500 MG Oral Tablet")
  'GPCK', // Generic Pack (e.g., "Metformin 500 MG Oral Tablet [Pack]")
  'BPCK', // Branded Pack
  'SCDG', // Semantic Clinical Drug Group (sometimes useful)
  'SBDG', // Semantic Branded Drug Group
]);

// Term Types to EXCLUDE - generic ingredients without strength
const EXCLUDE_GENERIC_TYPES = new Set([
  'IN',   // Ingredient (e.g., "Metformin")
  'PIN',  // Precise Ingredient
  'MIN',  // Multiple Ingredients
  'BN',   // Brand Name only
]);

export interface DrugSearchResult {
  rxcui: string;
  name: string;
  displayName: string;
  termType?: string;
  synonym?: string;
  score?: string;
  scoreValue: number;
  confidence: MatchConfidence;
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

interface RxNormPropertiesResponse {
  properties?: {
    rxcui: string;
    name: string;
    tty?: string;
    synonym?: string;
  };
}

/**
 * Classify match confidence based on score AND string similarity
 */
function classifyConfidence(
  scoreValue: number,
  drugName: string,
  query: string
): MatchConfidence {
  const normalizedDrug = drugName.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if query is at the START of the drug name (word boundary)
  const drugWords = normalizedDrug.split(/\s+/);
  const firstWord = drugWords[0] || '';
  
  // Exact: query matches the first word exactly or is prefix of first word
  if (firstWord === normalizedQuery || firstWord.startsWith(normalizedQuery)) {
    return 'exact';
  }
  
  // High: query appears at start of drug name but with space
  if (normalizedDrug.startsWith(normalizedQuery + ' ')) {
    return 'high';
  }
  
  // High: low RxNorm score (but not exact match)
  if (scoreValue <= 5) {
    return 'high';
  }
  
  // Similar: moderate score or contains query
  if (scoreValue <= 20 || normalizedDrug.includes(normalizedQuery)) {
    return 'similar';
  }
  
  return 'similar';
}

/**
 * Normalize drug name for display (Title Case)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Fetch term type (TTY) for an RxCUI to filter results
 */
async function getRxNormProperties(rxcui: string): Promise<{ tty?: string; name?: string }> {
  try {
    const url = `${RXNORM_BASE_URL}/rxcui/${rxcui}/properties.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return {};
    }

    const data: RxNormPropertiesResponse = await response.json();
    return {
      tty: data.properties?.tty,
      name: data.properties?.name,
    };
  } catch (error) {
    return {};
  }
}

/**
 * Search for drugs by name prefix (fuzzy/approximate match)
 * Filters to clinical drugs with strength/dosage, excludes generic ingredients
 * 
 * @param query - Search term (e.g., "metf", "lisin")
 * @param maxResults - Maximum number of results (default: 10)
 * @returns Array of drug search results with strength, sorted by relevance
 */
export async function searchDrugs(
  query: string,
  maxResults: number = 10
): Promise<DrugSearchResult[]> {
  // Validation
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const trimmedQuery = query.trim();
    
    // Request more results than needed since we'll filter
    const requestLimit = Math.min(maxResults * 5, 50);
    const url = `${RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(trimmedQuery)}&maxEntries=${requestLimit}`;

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
    const candidates = data.approximateGroup?.candidate || [];

    if (candidates.length === 0) {
      return [];
    }

    // Fetch term types in parallel (with a reasonable batch size)
    const resultsWithTypes: Array<DrugSearchResult & { tty?: string }> = [];
    
    for (const candidate of candidates.slice(0, 30)) {
      const rawName = candidate.name?.trim();
      if (!rawName) continue;

      const scoreValue = Number(candidate.score ?? Number.POSITIVE_INFINITY);
      
      // Fetch properties to get term type
      const props = await getRxNormProperties(candidate.rxcui);
      const tty = props.tty;
      
      // Skip generic ingredients without strength
      if (tty && EXCLUDE_GENERIC_TYPES.has(tty)) {
        continue;
      }
      
      // Skip if not a clinical drug type (unless it's a very good match)
      if (tty && !CLINICAL_DRUG_TYPES.has(tty) && scoreValue > 3) {
        continue;
      }

      const displayName = normalizeName(rawName);
      const confidence = classifyConfidence(scoreValue, rawName, trimmedQuery);
      
      resultsWithTypes.push({
        rxcui: candidate.rxcui,
        name: rawName,
        displayName,
        termType: tty,
        score: candidate.score,
        scoreValue,
        confidence,
      });
    }

    // Deduplicate by lowercase name
    const uniqueMap = new Map<string, DrugSearchResult>();
    for (const result of resultsWithTypes) {
      const key = result.name.toLowerCase();
      const existing = uniqueMap.get(key);
      
      // Keep result with better score OR prefer SCD/SBD types
      if (!existing || result.scoreValue < existing.scoreValue) {
        uniqueMap.set(key, result);
      } else if (result.scoreValue === existing.scoreValue && result.termType === 'SCD') {
        uniqueMap.set(key, result);
      }
    }

    const deduped = Array.from(uniqueMap.values());

    // Sort by confidence, then score, then alphabetically
    deduped.sort((a, b) => {
      // Exact matches first
      if (a.confidence === 'exact' && b.confidence !== 'exact') return -1;
      if (b.confidence === 'exact' && a.confidence !== 'exact') return 1;
      
      // Then by score
      if (a.scoreValue !== b.scoreValue) {
        return a.scoreValue - b.scoreValue;
      }
      
      // Then alphabetically
      return a.displayName.localeCompare(b.displayName);
    });

    return deduped.slice(0, maxResults);
  } catch (error) {
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

