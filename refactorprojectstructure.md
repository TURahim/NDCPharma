Cursor Prompt — “Team-Ready Backend + Task List Rewrite”

You are refactoring this repo for a larger engineering team and updating the backend task list. All changes are for the NDC Packaging & Quantity Calculator.

Authoritative inputs (read first):

README.md (current project structure & roadmap)

backend-task-list*.md (current PR plan)

Goals

Team-ready structure: convert to pnpm workspaces with clear module boundaries and code ownership.

Task list rewrite: collapse to a fast MVP plan (PR-01..03) and fix gaps (FDA/RxNorm flow, optional API keys, SIG parsing scope, unit conversion constraints, PHI redaction, rate limiting, staging deploy).

Docs & configs: align README with the new structure and Next.js frontend; correct any mentions that conflict with reality.

1) Create monorepo workspaces

At repo root, add/modify:

pnpm-workspace.yaml

packages:
  - apps/*
  - packages/*


Move backend/functions/ to apps/functions/ (keep Git history if possible).

Create packages/ and scaffold these libraries (TypeScript, tsconfig.json, package.json with "type":"module"):

packages/api-contracts/ – zod schemas + openapi.yaml for CalculateRequest/Response.

packages/domain-ndc/ – pure business logic (quantity.ts, packageMatch.ts, domain types.ts).

packages/clients-rxnorm/ – HTTP client + mappers for RxNorm.

packages/clients-openfda/ – HTTP client + mappers for openFDA (marketing status, packaging strings).

packages/data-cache/ – cache abstraction with Firestore adapter.

packages/core-config/ – env, feature flags (OpenAI OFF by default), constants.

packages/core-guardrails/ – redaction, PHI guards, rate limit, logger, errors.

packages/utils/ – small shared helpers (e.g., unit parsing).

In apps/functions/:

Keep a thin HTTP layer (src/api/v1/calculate.ts, src/api/v1/health.ts, src/api/v1/middlewares/*, src/index.ts).

Replace internal imports with the new packages (no domain or client code left in apps/functions).

Add .github/CODEOWNERS and assign each packages/* folder to a logical team.

Update root CI (.github/workflows/ci.yml) to run pnpm -r build, pnpm -r test.

2) Update imports & TypeScript configs

Root tsconfig.base.json with path aliases for all packages/*.

Each package gets its own tsconfig.json; apps/functions/tsconfig.json extends the base.

Convert any relative imports in the former backend/functions/src/... to package imports (e.g., @domain-ndc/packageMatch).

3) Correct the FDA/RxNorm data flow

Do not implement searchNDCByRxCUI() via FDA. Replace with:

clients-rxnorm: nameToRxCui(name) and rxcuiToNdcs(rxcui).

clients-openfda: enrichNdcs(ndcs) → adds marketing status, packaging strings.

Remove/rename any tasks and code that imply FDA can query by RxCUI directly. (Fix in task list too.)

4) Environment + compliance fixes

Env vars: OpenAI key (optional feature-flagged), no required keys for RxNorm/openFDA (openFDA key optional for higher rate limits). Remove “required” checks for RXNORM_API_KEY/FDA_API_KEY.

Add a redaction gate in the middleware pipeline; ensure no PHI appears in logs, cache keys, or persisted docs.

Default OpenAI OFF; provide a non-AI path. Add feature flag in packages/core-config.

5) Rate limiting & deployment

Implement a simple token-bucket limiter in core-guardrails (option: in-memory burst + sharded Firestore counters).

Deployment: use staging project → smoke tests → prod. Don’t claim traffic-splitting/canary for Functions; document promotion steps.

6) Rewrite the backend task list (replace file)

Find backend-task-list*.md; replace with docs/backend-task-list.md using the exact content below:

# Backend Task List — NDC Packaging & Quantity Calculator (Firebase + Workspaces)

> Scope: Backend only. Frontend is Next.js (already built). MVP target: POST /api/v1/calculate that normalizes drug, fetches valid NDCs, computes quantity, explains recommendation.

## 📁 File Structure (team-ready)

repo/
├─ apps/
│  └─ functions/
│     └─ src/api/v1/{calculate.ts,health.ts}
│     └─ src/api/v1/middlewares/{validate.ts,error.ts,rateLimit.ts,redact.ts}
│     └─ src/index.ts
├─ packages/
│  ├─ api-contracts/
│  ├─ domain-ndc/
│  ├─ clients-rxnorm/
│  ├─ clients-openfda/
│  ├─ data-cache/
│  ├─ core-config/
│  ├─ core-guardrails/
│  └─ utils/
├─ tests/{unit,integration,contract}
├─ docs/{backend-task-list.md,ADRs/}
└─ .github/{workflows/ci.yml,CODEOWNERS}

## 🔁 Data Flow (corrected)
RxNorm: name → RxCUI → NDC list (primary).  
openFDA: enrich NDCs (marketing status, packaging text).  
Cache: RxCUI→NDC list (24h TTL). No PHI in keys/docs.

## 🔐 Compliance
- No PHI in logs/cache. Redaction middleware.
- OpenAI OFF by default; strict payload minimization; fallback path always available.
- RxNorm/openFDA keys optional.

## ✅ Acceptance Criteria
- Exactness (solids): prefer exact package; ≤5% overfill else show top-3 combos.
- Inactive exclusion: never recommend inactive/recalled items; list under “Excluded” with reasons.
- Latency: p95 < 2s warm, < 4s cold; prove in integration tests.
- Explainability: `explanations[]` describing match, quantity, package, over/underfill.

## PR-01 — Walking Skeleton (1–2 days)
- [ ] Scaffold workspaces (`pnpm-workspace.yaml`); move backend to `apps/functions`.
- [ ] Create packages: api-contracts, domain-ndc, clients-*, data-cache, core-config, core-guardrails, utils.
- [ ] Implement `/api/v1/health`, `/api/v1/calculate` (structured input only; defer free-text SIG).
- [ ] `domain-ndc`: `quantity.ts` (solids), `packageMatch.ts` (over/underfill calc).
- [ ] Wire middlewares: validate (zod), error, redact, rateLimit (basic).
- [ ] Contract tests for `CalculateRequest/Response` (api-contracts).
- Files: see tree above.

## PR-02 — Real Data & Cache (2–3 days)
- [ ] `clients-rxnorm`: `nameToRxCui`, `rxcuiToNdcs`; parse dosage forms/strengths.
- [ ] `clients-openfda`: `enrichNdcs` (marketing status, packaging); optional API key support.
- [ ] `data-cache`: cache-aside for RxCUI→NDCs, TTL 24h; keys like `rxnorm:<rxcui>`.
- [ ] Integrate services into `/api/v1/calculate`; keep `explanations[]`.
- [ ] Unit tests for packaging string parsing (`"100 TABLET"`, `"30 mL"`, `"1 KIT"`, `"2.5 mg/mL"`); integration tests for cold vs warm cache timings.

## PR-03 — Hard Edges & Safety (2–3 days)
- [ ] Dosage-form filter; over/underfill warnings.
- [ ] Unit conversion constraints: allow liquids/insulin when concentration present; forbid tablet→mL without context.
- [ ] Exclude inactive/recalled NDCs; include reasons in `excluded[]`.
- [ ] Redaction gate finalized + “compliance mode” for minimal logging.
- [ ] Basic rate limit finalized; generous defaults.
- [ ] Integration tests assert p95 latency budget.

## Later PRs
- Free-text SIG parser (grammar/regex/LLM) behind feature flag with fixtures.
- Optional AI enhancer (default OFF).
- Admin dashboard (metrics, cache purge), CI/CD hardening, alerts.
- Cost ranking (only with trustworthy source), feature-flagged.


7) README alignment

Keep Next.js as the stated frontend framework (that matches current reality). Ensure new workspaces structure and the apps/ + packages/ tree are reflected. Update “Upcoming (Backend Development)” to the MVP PR-01..03 list rather than 10 PRs.

8) Remove/correct specific items

In any task/docs mentioning FDA searchNDCByRxCUI(), replace with RxNorm mapping + FDA enrichment call names.

In env docs, mark RXNORM_API_KEY/FDA_API_KEY as optional; do not block runtime if missing.

Deliverables (commit all):

New workspaces structure with apps/ and packages/.

Updated imports/configs, CI, CODEOWNERS.

Rewritten docs/backend-task-list.md.

Updated README.md with accurate structure and PR plan.

Return only: a short summary of changes + the list of modified files.