Backend Migration Plan — Multi-Path FDA Search
Objective: Replace the current RxCUI-only FDA lookup with a resilient, multi-path search engine that always returns clinically complete package data for common drugs, while preserving RxNorm normalization and downstream interfaces.
1. Architecture Overview
Keep RxNorm normalization and query parsing (parseDrugQuery, resolveDrugConcept) as-is.
Introduce a new orchestrator drugSearchStrategy.ts responsible for the entire FDA lookup + consolidation flow.
Expose a single runDrugSearchStrategy(request, context) entry point that returns { drugConcept, packages, metadata, logs }.
performDrugSearch will become a thin wrapper: normalize → invoke strategy → apply optional filters → shape final response.
2. FDA Lookup Strategy (new module)
Inputs: normalized concept (rxcui, generic names, brand names, ingredient list, parsed tokens), original user filters, context/log sinks.
Path runners:
searchByRxCui(rxcui) – paginated, collects full dataset.
searchByGenericName(normalizedGeneric) – paginated; triggered when RxCUI result count < threshold or zero.
searchByBrandName(brand) – support multiple brand tokens (from concept + original input).
searchByFullText(drugName) – fallback that queries general text/active ingredient (support active_ingredient, product_ndc etc).
Pagination: unify via helper fetchAllPages(queryFn, searchTerm), honoring FDA max paging and internal MAX_PAGES guard.
Deduplication: NDCPackages returned from multiple paths must be merged by package.ndc (or package.productNdc+package.ndc). Keep sourcePaths metadata per package for debugging.
Active/Inactive Split: do not drop inactive. Instead, tag each package with isActive and marketing metadata immediately after normalization.
Metadata: collect counts per path, sourcesUsed, fallbackTriggered, totalActive/Inactive, unique strengths/forms, warnings (e.g., “RxCUI returned 0 results; fallback via generic_name”).
Logging: Provide structured logs (per request):
attempted paths order,
row counts per path,
deduped totals,
fallback flags,
errors (but never throw until all paths exhausted).
Error handling: Only throw final FDA_LOOKUP_FAILED if all paths returned zero packages; include attempted paths in error details.
3. Supporting Client Enhancements
Extend FDAClient:
Add searchByBrandName(brandName: string, options) to wrap brand_name:"...".
Add searchByFullText(query: string, options) to wrap generic search="<query>" and search=active_ingredient:"...".
Ensure all public methods accept skip/limit to support pagination (already mostly there).
Optionally add a utility fetchAllPackages({ searchFn, label, term }) in the new strategy module to encapsulate pagination.
4. Data Normalization & Filtering
Reuse existing normalizePackages (but update to accept combined dataset including inactive).
Keep inactive packages available downstream; when performDrugSearch filters by strength/form, apply filters against the active subset but keep metadata of total inactive.
Consider including inactive packages in response under metadata.totalInactivePackages even if UI hides them.
5. Endpoint Integration
performDrugSearch flow:
Normalize request (current behavior).
Call runDrugSearchStrategy.
Apply optional strength/form filters (post-merge).
Map normalized packages (both active + metadata) into API response structure, including metadata.sourcesUsed, fallbackTriggered, totalActive/Inactive.
Ensure existing error codes (NO_PACKAGES_FOUND, etc.) still make sense; update where necessary (e.g., new error FDA_LOOKUP_INCOMPLETE?).
6. Testing Plan
Add integration tests under apps/functions/tests/drug-search/ covering:
Scenario	Expectation
amoxicillin	RxCUI returns few; ensure generic fallback triggers and returns packages
metformin	RxCUI 0; generic search success
lisinopril	RxCUI success, no fallback
amoxicillin-clavulanate	Multi-ingredient fallback (active_ingredient path)
insulin glargine	Non-oral forms; route variety preserved
Inhaler (e.g., albuterol inhaler)	Brand/full-text fallback returns inhalation routes
Each test should assert sourcesUsed, fallbackTriggered, package counts, active/inactive info.
7. Documentation
Create /docs/SEARCH_PIPELINE_REWRITE.md:
Diagram of new flow (RxNorm → multi-path FDA).
Path priority list and triggers.
Logging + debugging guidance.
Testing matrix and future extension points (e.g., caching, Firestore storage).
8. Deliverables Summary
New module apps/functions/src/services/search/drugSearchStrategy.ts with orchestrated logic.
Updated FDAClient/service to support brand/full-text searches + pagination helpers.
Updated performDrugSearch & endpoint logging.
Comprehensive tests for required drugs.
Documentation describing the pipeline.
If this plan looks good, I’ll proceed with implementation following these steps in order (client updates → strategy module → service wiring → tests → docs). Let me know if you’d like any adjustments before coding.