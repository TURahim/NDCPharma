/**
 * RxNorm Alternative Drug Finder
 * Finds related drugs in the same therapeutic class or with the same ingredient
 */

import { rxnormService } from './rxnormService';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'AlternativeFinder' });

/**
 * Related drug information
 */
export interface RelatedDrug {
  /**
   * RxNorm Concept Unique Identifier
   */
  rxcui: string;
  
  /**
   * Drug name
   */
  name: string;
  
  /**
   * Term type (SCD, SBD, etc.)
   */
  tty?: string;
  
  /**
   * Relationship type to original drug
   */
  relationshipType?: string;
}

/**
 * Find related drugs for a given RxCUI
 * Uses multiple RxNorm APIs to find drugs with same ingredient or therapeutic class
 */
export async function findRelatedDrugs(rxcui: string): Promise<RelatedDrug[]> {
  const startTime = Date.now();
  
  try {
    logger.info(`Finding alternative drugs for RxCUI: ${rxcui}`);
    
    const relatedDrugs: RelatedDrug[] = [];
    const seenRxcuis = new Set<string>([rxcui]); // Don't include the original drug
    
    // Step 1: Get drugs with same ingredient using related endpoint
    try {
      const relatedResponse = await rxnormService.getRelatedConcepts(rxcui, ['SCD', 'SBD']);
      
      if (relatedResponse?.relatedGroup?.conceptGroup) {
        for (const group of relatedResponse.relatedGroup.conceptGroup) {
          if (group.conceptProperties) {
            for (const concept of group.conceptProperties) {
              if (!seenRxcuis.has(concept.rxcui)) {
                relatedDrugs.push({
                  rxcui: concept.rxcui,
                  name: concept.name,
                  tty: concept.tty,
                  relationshipType: 'related'
                });
                seenRxcuis.add(concept.rxcui);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to get related drugs: ${error}`, error as Error);
    }
    
    // Step 2: Get ingredient and find other drugs with same ingredient
    try {
      const ingredientResponse = await rxnormService.getAllRelatedInfo(rxcui, ['IN']);
      
      if (ingredientResponse?.allRelatedGroup?.conceptGroup) {
        const ingredientGroup = ingredientResponse.allRelatedGroup.conceptGroup.find(
          (g: any) => g.tty === 'IN'
        );
        
        if (ingredientGroup?.conceptProperties?.[0]) {
          const ingredientRxcui = ingredientGroup.conceptProperties[0].rxcui;
          const ingredientName = ingredientGroup.conceptProperties[0].name;
          
          logger.info(`Found ingredient: ${ingredientName} (${ingredientRxcui})`);
          
          // Find other drugs with this ingredient
          const drugsByIngredient = await rxnormService.getApproximateMatches({
            term: ingredientName,
            maxEntries: 10
          });
          
          if (drugsByIngredient?.approximateGroup?.candidate) {
            for (const candidate of drugsByIngredient.approximateGroup.candidate) {
              // Only include clinical drug forms (SCD, SBD)
              if ((candidate.rank <= 50) && // Good match
                  !seenRxcuis.has(candidate.rxcui)) {
                
                // Get TTY to filter
                try {
                  const props = await rxnormService.getRxCUIProperties(candidate.rxcui);
                  if (props?.properties?.tty === 'SCD' || props?.properties?.tty === 'SBD') {
                    relatedDrugs.push({
                      rxcui: candidate.rxcui,
                      name: candidate.name,
                      tty: props.properties.tty,
                      relationshipType: 'same_ingredient'
                    });
                    seenRxcuis.add(candidate.rxcui);
                  }
                } catch (error) {
                  // Skip if can't get properties
                  logger.debug(`Skipping candidate ${candidate.rxcui}: ${error}`);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to find drugs by ingredient: ${error}`, error as Error);
    }
    
    // Limit to top 10 results
    const limitedResults = relatedDrugs.slice(0, 10);
    
    const executionTime = Date.now() - startTime;
    logger.info(`Found ${limitedResults.length} alternative drugs in ${executionTime}ms`, {
      originalRxcui: rxcui,
      alternativeCount: limitedResults.length,
      executionTime
    });
    
    return limitedResults;
    
  } catch (error) {
    logger.error(`Error finding alternative drugs for ${rxcui}: ${error}`, error as Error);
    return [];
  }
}

