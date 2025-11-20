## Drug Search API Redesign

### Overview
The `/api/v1/search` endpoint has been rebuilt to mirror the ideal pharmacist workflow:

1. Parse and normalize user queries (drug name, strength, dosage-form cues).
2. Resolve the authoritative drug concept (RxCUI) via a multi-strategy RxNorm pipeline with FDA fallback.
3. Retrieve **all** FDA NDC packages (active + inactive) with pagination.
4. Normalize package data for UI consumption and downstream SIG/quantity calculations.
5. Apply pharmacist-grade filters (strength, dosage form) with precise error codes.
6. Respond with metadata required by the new frontend workflow.

### Architecture Modules
| Module | Responsibility |
| --- | --- |
| `inputParser` | Tokenizes drug queries into normalized base name, strength tokens, dosage form / release modifiers. |
| `rxnormResolver` | Resolves RxCUI using: direct RxCUI → normalized name → FDA generic fallback, returning structured `DrugConcept`. |
| `fdaPackageService` | Fetches paginated openFDA results (active + inactive), splits by marketing status, surfaces unique strengths/forms. |
| `packageNormalizer` | Converts raw `NDCPackage` into pharmacist-friendly rows (hyphenated NDC, title-cased names, dosage-form family, package size display, marketing labels). |
| `packageFilter` | Applies normalized strength and dosage-form keyword filtering and reports when no matches remain. |
| `searchService` | Orchestrates the full flow, assembles metadata, emits structured logging, and raises `DrugSearchError` codes for the handler. |

### Error Taxonomy
| Code | Scenario |
| --- | --- |
| `DRUG_NOT_FOUND` | Neither `drugName` nor `rxcui` provided / no RxNorm match. |
| `RXNORM_LOOKUP_FAILED` | RxNorm resolution failed and FDA fallback returned nothing. |
| `FDA_LOOKUP_FAILED` | openFDA query returned no results (even after pagination). |
| `NO_ACTIVE_PACKAGES` | FDA returned packages, but none are active. |
| `ONLY_INACTIVE_PACKAGES` | FDA returned results but all are inactive (still surfaced via metadata for UI). |
| `NO_MATCHING_STRENGTH` | Strength filter removed all packages. |
| `NO_MATCHING_DOSAGE_FORM` | Dosage-form keywords removed all packages. |
| `NO_PACKAGES_FOUND` | Generic catch for empty dataset. |

### Logging & Observability
- Every stage logs via `@core-guardrails` with `requestId` and `correlationId`.
- External API calls (RxNorm, FDA) record result counts and durations.
- Filter failures log warnings (e.g., no packages match strength).

### Tests
`apps/functions/tests/drug-search/searchService.test.ts` covers:
- Successful search for common generics (multiple packages, metadata counts).
- Strength filtering failures (`NO_MATCHING_STRENGTH`).
- Handling of inactive-only datasets (`ONLY_INACTIVE_PACKAGES`).
- Direct RxCUI path.
- FDA fallback when RxNorm normalization fails (misspellings / brand-only input).

Additional cases (multi-form filtering, brand-only success, misspelling suggestions) can be added on top of this foundation by extending the mocks.

### Future Enhancements
- Ingredient-level enrichment via RxNorm ingredient APIs.
- Additional tokenizer dictionaries for dosage forms/routes.
- Telemetry dashboards for cache hit rate (when caching layer is added).

