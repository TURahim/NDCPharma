/**
 * OpenAI Alternative Drug Comparator
 * Uses AI to compare and explain drug alternatives
 */

import { openaiService } from './openaiService';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'AlternativeComparator' });

/**
 * Drug comparison request
 */
export interface DrugComparisonRequest {
  /**
   * Original drug name
   */
  originalDrug: string;
  
  /**
   * Original drug RxCUI
   */
  originalRxcui: string;
  
  /**
   * Alternative drugs to compare
   */
  alternatives: Array<{
    rxcui: string;
    name: string;
  }>;
}

/**
 * Comparison for a single alternative
 */
export interface AlternativeComparison {
  /**
   * Alternative drug RxCUI
   */
  rxcui: string;
  
  /**
   * Alternative drug name
   */
  name: string;
  
  /**
   * AI-generated comparison text
   */
  comparison: string;
  
  /**
   * Recommendation/guidance
   */
  recommendation: string;
}

/**
 * Drug comparison response
 */
export interface DrugComparisonResponse {
  /**
   * Summary of why original drug isn't available
   */
  summary: string;
  
  /**
   * Array of alternative comparisons
   */
  alternatives: AlternativeComparison[];
}

/**
 * System prompt for drug comparison
 */
const COMPARISON_SYSTEM_PROMPT = `You are a clinical pharmacist assistant helping to identify suitable drug alternatives.

Your role is to:
1. Compare FDA-approved alternatives to an unavailable/discontinued drug
2. Explain similarities (therapeutic class, indication, mechanism of action)
3. Note key differences (strength, formulation, dosing frequency)
4. Provide brief, clinical guidance on substitution suitability

Guidelines:
- Be concise: 2-3 sentences per comparison
- Be factual and clinical
- Focus on therapeutic equivalence
- Note any important differences in formulation or strength
- Use professional medical terminology`;

/**
 * Generate comparison prompt
 */
function generateComparisonPrompt(request: DrugComparisonRequest): string {
  const alternativesList = request.alternatives
    .map((alt, i) => `${i + 1}. ${alt.name} (RxCUI: ${alt.rxcui})`)
    .join('\n');

  return `Compare the following medications:

**Original Drug (not FDA-approved/available):**
${request.originalDrug} (RxCUI: ${request.originalRxcui})

**FDA-Approved Alternatives:**
${alternativesList}

For EACH alternative, provide:
1. **Therapeutic Similarity**: How similar is it to the original (same drug class, same indication)?
2. **Key Differences**: Important differences in strength, formulation, or dosing
3. **Substitution Recommendation**: Brief clinical guidance on suitability as a substitute

Format your response as JSON:
{
  "summary": "Brief explanation of why original isn't available",
  "alternatives": [
    {
      "rxcui": "alternative_rxcui",
      "name": "alternative_name",
      "comparison": "2-3 sentence comparison of similarities and differences",
      "recommendation": "1-2 sentence substitution guidance"
    }
  ]
}`;
}

/**
 * Compare alternatives using OpenAI
 */
export async function compareAlternatives(
  request: DrugComparisonRequest
): Promise<DrugComparisonResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Comparing drug alternatives', {
      originalDrug: request.originalDrug,
      alternativeCount: request.alternatives.length
    });

    // Check if OpenAI is enabled
    if (!openaiService.isEnabled()) {
      logger.warn('OpenAI not enabled, returning generic comparisons');
      return generateFallbackResponse(request);
    }

    const prompt = generateComparisonPrompt(request);
    
    const response = await openaiService.chat({
      messages: [
        { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Low temperature for factual medical information
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed: DrugComparisonResponse = JSON.parse(content);
    
    // Validate response structure
    if (!parsed.summary || !parsed.alternatives || !Array.isArray(parsed.alternatives)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    const executionTime = Date.now() - startTime;
    logger.info('Drug comparison completed', {
      originalDrug: request.originalDrug,
      alternativeCount: parsed.alternatives.length,
      executionTime,
      tokensUsed: response.usage?.total_tokens
    });

    return parsed;
    
  } catch (error) {
    logger.error(`Error comparing alternatives: ${error}`, error as Error);
    
    // Return fallback response on error
    return generateFallbackResponse(request);
  }
}

/**
 * Generate fallback response when AI is unavailable
 */
function generateFallbackResponse(request: DrugComparisonRequest): DrugComparisonResponse {
  return {
    summary: `${request.originalDrug} is not available in the FDA NDC Directory. This may indicate the drug is discontinued, not FDA-approved, or not marketed in the US.`,
    alternatives: request.alternatives.map(alt => ({
      rxcui: alt.rxcui,
      name: alt.name,
      comparison: `${alt.name} is an FDA-approved alternative. Consult prescribing information to verify therapeutic equivalence and appropriate dosing.`,
      recommendation: 'Verify with prescriber before substitution. Check for therapeutic equivalence and patient-specific contraindications.'
    }))
  };
}

