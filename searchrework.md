Stage 1 — Deep Dive & Design
Audit Existing Clients
Review @clients-rxnorm (nameToRxCui), @clients-openfda (fdaClient.getNDCsByRxCUI), the NDCPackage model, and domain utilities.
Identify gaps (normalization, pagination, inactive handling, structure).
Findings:
- `@clients-rxnorm` currently exposes `nameToRxCui` via a facade with optional enhanced normalization (controlled by `USE_ENHANCED_NORMALIZATION`). The façade returns `rxcui`, `name`, `dosageForm`, `strength`, `confidence`, and alternative suggestions, but it does not expose ingredient-level metadata or structured token parsing we need. We must wrap it with our own token parser (strength/form extraction) and add fallbacks: direct RxCUI → normalized name → ingredient search → FDA generic query. We should plan to extend/compose the internal normalizer rather than rewriting it, and add better error taxonomy (`RXNORM_LOOKUP_FAILED`, fallback hints).
- `@clients-openfda` (`fdaClient`) currently paginates with manual `limit`/`skip` but defaults to a single page (limit 100). It maps results via `mapFDAResultToNDCPackage`, giving us `NDCPackage` objects with normalized `packageSize`, `marketingStatus`, `activeIngredients`, etc. However:
  * It only fetches one page per call; we must implement full pagination (loop until `meta.results.total` satisfied).
  * `getNDCsByRxCUI` supports `activeOnly` filtering that removes inactive packages entirely — we instead need both active + inactive to power new error states.
  * `map` currently emits FDA strings (uppercase) and does not format hyphenated NDCs for display. We'll extend normalization to include front-end-ready strings (title case, hyphenation).
- Domain helpers (`@domain-ndc`) already contain unit converters, dosage form normalization, and validation utilities. We should leverage these for our new `packageNormalizer` module (e.g., use `parseDosageForm`, `unitConverter`, etc.) rather than duplicating logic.
- Existing `searchHandler` stops after first RxNorm normalization + single FDA call, returns raw `NDCPackage[]`, lacks metadata counts, and surfaces only `DRUG_NOT_FOUND` / `NO_PACKAGES_FOUND`. It does not parse strength tokens, handle inactive-only scenarios, or provide metadata. We will replace it completely.
Design New Architecture
Define core modules:
inputParser: extracts base name, strength tokens, dosage form cues from drugName.
rxnormResolver: multi-strategy resolver (direct RxCUI, normalized name, ingredient fallback).
fdaPackageService: handles pagination, active/inactive tagging, conversion to normalized DTOs.
packageNormalizer: central place to clean/format package fields.
packageFilter: applies refined filters (strength, dosage form keywords).
searchResponseBuilder: builds the new response structure + metadata.
Type/Contract Updates
Define new request/response types (including metadata, error codes).
Document error taxonomy and log fields.
Stage 2 — Core Infrastructure
Implement Input Parsing + Normalization Utilities
Token extraction (strength units, dosage form keywords).
Standardized form/strength dictionaries.
Logging for what was parsed.
[x] Implemented `parseDrugQuery` utility under `apps/functions/src/services/drug-search/inputParser.ts`. It normalizes the inbound query, extracts strength tokens via regex (`500 mg`, `5 mL`), identifies dosage-form keywords (tablet, XR, suspension, etc.), and separates release-type modifiers (ER/XR/DR). Results are deduped, lowercased, and logged for observability.
RxNorm Resolver
Steps: direct RxCUI → normalized name → ingredient search → fallback to FDA generic.
Rich logging + error taxonomy (RXNORM_LOOKUP_FAILED).
Return normalized drug metadata (clinical name, ingredient name, resolved forms/strengths).
[/] Added `resolveDrugConcept` in `rxnormResolver.ts`. It:
   1. Attempts direct RxCUI resolution if provided.
   2. Falls back to `nameToRxCui` using the parsed base name.
   3. If RxNorm fails, queries FDA generic name as best-effort fallback (tagged `source: 'fda_generic'` with warnings).
   Currently the ingredient-level enrichment is limited to what RxNorm returns; future enhancement can plug in ingredient service for deeper metadata.
FDA Package Retrieval Layer
Remove 100-limit; implement pagination until exhaustion.
Fetch both active/inactive.
Tag marketing status and provide counts.
Handle retry/backoff, log FDA_LOOKUP_FAILED.
[x] Added `fetchFdaPackagesForRxcui` in `fdaPackageService.ts` that paginates openFDA in 100-record chunks (up to 20 pages), collects both active/inactive packages, splits them by marketing status, and surfaces unique strengths/forms for downstream metadata. Errors bubble up as `FDA_LOOKUP_FAILED`.

Stage 3 — Data Normalization & Filtering
Package Normalization Layer
Convert raw FDA record → pharmacist model:
     {       ndcFormatted,       brandNameNormalized,       genericNameNormalized,       strengthNormalized,       dosageFormNormalized,       packageSizeNormalized,       manufacturerNormalized,       marketingStatus, route, etc.     }
Build helper utilities for formatting (hyphenated NDC, title casing, etc.).
Collect unique strengths/forms for metadata.
[x] Implemented `normalizePackages` (`packageNormalizer.ts`). Each raw `NDCPackage` is transformed into a `NormalizedPackage` with:
   - Hyphenated NDC (`formattedNdc`).
   - Title-cased brand/generic/labeler values.
   - Combined strength string from active ingredients.
   - User-friendly package size display (quantity + unit).
   - Normalized dosage form + family (via `@domain-ndc`).
   - Marketing status (`active`/`inactive`) with printable labels.
   These normalized objects will be the basis for UI table rows and downstream filtering.
Filtering Engine
Strength comparison operator (split tokens, numeric comparison when possible).
Dosage-form keyword matching based on normalized dictionary.
Provide error codes for zero-match cases (NO_MATCHING_STRENGTH / NO_MATCHING_DOSAGE_FORM).
[x] Added `filterPackages` (`packageFilter.ts`), which accepts `PackageFilterOptions` (strength, dosage-form keywords) and returns filtered normalized packages along with a failure reason when no matches remain. Strength matching uses normalized string comparisons (case/whitespace agnostic); dosage-form matching is keyword-based against normalized titles. This sets up the Stage 4 handler to emit precise error codes.
Stage 4 — Search Handler Rewrite
New Handler Flow
Parse request & log correlation ID.
Run input parser → tokens.
Resolve RxNorm concept (with fallback).
Fetch FDA packages (active + inactive).
Normalize packages.
Apply optional filters.
Build metadata (counts, unique strengths/forms).
Return new structured response + success logging.
[x] Implemented `performDrugSearch` service (`searchService.ts`) orchestrating the new flow: parse → resolve concept (with RxNorm & FDA fallback) → fetch paginated FDA packages → normalize → filter → assemble response (drug metadata, packages, counts, unique strengths/forms). Added `DrugSearchError` for consistent error handling.
[x] Replaced `searchHandler` to call the service, emit structured `SearchResponse`, and map custom errors to HTTP statuses. Handler now includes request/correlation IDs for logging.
Error Handling
Map failure points to required error codes.
Return ONLY_INACTIVE_PACKAGES, NO_ACTIVE_PACKAGES, etc., with actionable details.
Provide warning details (e.g., fallback used).
[x] `performDrugSearch` throws `DrugSearchError` codes for each scenario (DRUG_NOT_FOUND, RXNORM_LOOKUP_FAILED, FDA_LOOKUP_FAILED, NO_ACTIVE_PACKAGES, ONLY_INACTIVE_PACKAGES, NO_MATCHING_STRENGTH, NO_MATCHING_DOSAGE_FORM). Handler serializes these codes/messages, and concept warnings are included in the response payload.
Stage 5 — Observability & Tests
Structured Logging
Add log scopes for: normalization, RxNorm, FDA fetch, filtering, response.
Include counts, timings, error contexts.
[x] Existing modules now emit structured logs (`createLogger`) with request/correlation IDs. Search handler logs request start/end and errors; `rxnormResolver`, `fdaPackageService`, `packageFilter`, and `searchService` include counts/timings/failure contexts.
Integration Tests
Cover all scenarios specified (multi-form, inactive-only, misspellings, etc.).
Use fixtures/mocks for RxNorm + FDA clients.
Validate new response contracts.
[x] Added Vitest suite `apps/functions/tests/drug-search/searchService.test.ts` mocking RxNorm/FDA clients. Tests cover: successful generic search, strength filtering failure, inactive-only datasets, direct RxCUI path, and FDA fallback when RxNorm fails (misspellings/brand-only). Additional scenarios can extend these mocks easily.
Documentation
New MD summary (design decisions, flow diagram, error codes).
Update README/task list references.
[x] Authored `docs/DRUG_SEARCH_REDESIGN.md` describing architecture modules, error taxonomy, logging strategy, and test coverage. README updates deferred until frontend integration is complete.