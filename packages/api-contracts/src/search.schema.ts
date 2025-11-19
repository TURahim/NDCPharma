/**
 * Search API Schemas
 * Zod schemas for drug search endpoints
 */

import { z } from 'zod';

/**
 * Drug Badge Schema
 */
export const DrugBadgeSchema = z.object({
  type: z.enum(['ACTIVE', 'COMMON', 'PEDIATRIC', 'GENERIC', 'BRAND']),
  label: z.string(),
  variant: z.enum(['success', 'info', 'warning']),
});

export type DrugBadge = z.infer<typeof DrugBadgeSchema>;

/**
 * Drug Search Result Schema
 */
export const DrugSearchResultSchema = z.object({
  rxcui: z.string(),
  name: z.string(),
  strength: z.string(),
  dosageForm: z.string(),
  dosageFormFamily: z.enum(['SOLID', 'LIQUID', 'INJECTABLE', 'SPECIAL']),
  hasActiveNDCs: z.boolean(),
  ndcCount: z.number().int().nonnegative(),
  commonUsageScore: z.number().min(0).max(100),
  badges: z.array(DrugBadgeSchema),
  tty: z.string().optional(),
  description: z.string().optional(),
});

export type DrugSearchResult = z.infer<typeof DrugSearchResultSchema>;

/**
 * Dosage Form Group Schema
 */
export const DosageFormGroupSchema = z.object({
  dosageForm: z.string(),
  dosageFormFamily: z.enum(['SOLID', 'LIQUID', 'INJECTABLE', 'SPECIAL']),
  results: z.array(DrugSearchResultSchema),
  expanded: z.boolean(),
});

export type DosageFormGroup = z.infer<typeof DosageFormGroupSchema>;

/**
 * Grouped Search Results Schema
 */
export const GroupedSearchResultsSchema = z.object({
  dosageFormGroups: z.array(DosageFormGroupSchema),
  totalResults: z.number().int().nonnegative(),
  hasInactiveResults: z.boolean(),
});

export type GroupedSearchResults = z.infer<typeof GroupedSearchResultsSchema>;

/**
 * Availability State Schema
 */
export const AvailabilityStateSchema = z.enum([
  'ACTIVE_FOUND',
  'ONLY_INACTIVE',
  'NO_FDA_NDCS',
  'NOT_FOUND',
]);

export type AvailabilityState = z.infer<typeof AvailabilityStateSchema>;

/**
 * Drug Search Request Schema
 * POST /v1/search/drugs
 */
export const DrugSearchRequestSchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query must be less than 200 characters')
    .describe('Drug name or partial name to search for'),

  mode: z
    .enum(['simple', 'advanced'])
    .default('simple')
    .describe('Search mode: simple (grouped) or advanced (flat list)'),

  filters: z
    .object({
      activeOnly: z.boolean().default(true).describe('Only show active NDCs'),
      dosageForm: z.string().optional().describe('Filter by dosage form (e.g., TABLET)'),
      strength: z.string().optional().describe('Filter by strength (e.g., 500)'),
      manufacturer: z.string().optional().describe('Filter by manufacturer name'),
    })
    .optional()
    .describe('Filter options'),

  pagination: z
    .object({
      page: z.number().int().min(1).default(1).describe('Page number (1-indexed)'),
      limit: z.number().int().min(10).max(100).default(20).describe('Results per page'),
    })
    .optional()
    .describe('Pagination options (for advanced mode)'),
});

export type DrugSearchRequest = z.infer<typeof DrugSearchRequestSchema>;

/**
 * Pagination Info Schema
 */
export const PaginationInfoSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;

/**
 * Drug Search Response Schema
 * Response for /v1/search/drugs
 */
export const DrugSearchResponseSchema = z.object({
  results: z
    .array(DrugSearchResultSchema)
    .describe('Flat list of drug search results (for advanced mode)'),

  grouped: GroupedSearchResultsSchema
    .optional()
    .describe('Grouped results by dosage form (for simple mode)'),

  pagination: PaginationInfoSchema.describe('Pagination information'),

  availabilityState: AvailabilityStateSchema.describe('Overall availability state'),

  message: z.string().optional().describe('User-friendly message about search results'),

  searchDuration: z.number().optional().describe('Search duration in milliseconds'),
});

export type DrugSearchResponse = z.infer<typeof DrugSearchResponseSchema>;

/**
 * Search Error Response Schema
 */
export const SearchErrorResponseSchema = z.object({
  error: z.string().describe('Error message'),
  code: z.string().describe('Error code'),
  details: z.record(z.any()).optional().describe('Additional error details'),
});

export type SearchErrorResponse = z.infer<typeof SearchErrorResponseSchema>;

/**
 * Request validation helper
 */
export function validateSearchRequest(data: unknown): DrugSearchRequest {
  return DrugSearchRequestSchema.parse(data);
}

/**
 * Response validation helper
 */
export function validateSearchResponse(data: unknown): DrugSearchResponse {
  return DrugSearchResponseSchema.parse(data);
}


