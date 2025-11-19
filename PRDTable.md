PRD — Medication Search & Selection Overhaul

Product: Foundation Health – NDC Packaging & Quantity Calculator
Feature: Medication Search UX Rehaul
Status: Draft v1
Author: —

1. Executive Summary

Pharmacists using the NDC Packaging Calculator require fast, accurate drug selection. The current search behavior returns a large volume of raw RxNorm results—including inactive, obsolete, duplicate, and non-marketed products—resulting in cognitive overload, selection errors, and unexpected “no NDC found” states.

This PRD defines a redesigned search experience that provides:

Simple, clean, default search results for everyday users, and

A comprehensive, pharmacist-grade tabular view for power users.

The goal is to deliver a workflow that mirrors real pharmacy systems (e.g., Kroll, PioneerRX, QS/1) while maintaining the modern simplicity of Foundation Health’s UI.

2. Problem Statement

Pharmacists need to quickly identify the correct formulation, strength, and corresponding NDC package for a medication. The current search:

Returns too many results (including inactive entries)

Does not distinguish dosage forms or strengths effectively

Does not reflect real-world pharmacy search workflows

Produces unexpected errors when selected drugs lack active NDCs

Lacks visibility into manufacturers, package sizes, and statuses

This leads to user frustration and slows down prescription fulfillment.

3. Goals & Success Metrics
Goals

Provide a clean, simple search for general users

Provide a pharmacist-grade detailed view resembling real dispensing software

Separate active results from discontinued or non-FDA-listed drugs

Reduce selection errors by eliminating ambiguous or misleading search entries

Success Metrics

30%+ reduction in time-to-select a drug

90% of users select a drug from the simplified view

100% of power users report improved clarity and trust in results

Zero “false” errors where a clinically valid medication appears unavailable

4. Users & Use Cases
Primary Users

Pharmacists

Pharmacy Technicians

Clinical Operations Staff

Secondary Users

Non-clinical team members testing the system

5. User Stories
Simple Search Mode

As a pharmacist, I want to type a medication name and instantly see only the most relevant, active formulations.

As a pharmacy technician, I want search results grouped by dosage form so I can quickly find the correct strength.

As a general user, I want a clean and uncluttered experience without clinical complexity.

Advanced Table Mode

As an experienced pharmacist, I want to access a full list of all NDC-labeled products for a drug in a sortable, filterable table.

As a clinician, I want full visibility into strength, manufacturer, dosage form, and package size.

As an auditor or QA user, I want to inspect inactive or discontinued NDCs when needed.

Error & Availability Handling

As a pharmacist, I want clear messaging when a drug exists but has no active NDCs, so I know the issue is with availability—not my search.

6. Feature Requirements
6.1 Search Bar Requirements

Must support medication name, partial name, synonyms, and brand names.

Must support smart ranking of commonly used/products with active NDCs.

Must allow a toggle or link to “View full list” or “Advanced view.”

6.2 Simple Search Mode Requirements (Default)
Display Requirements

Show grouped results by dosage form (e.g., tablet, capsule, suspension).

Show only active, FDA-listed products by default.

Show commonly used strengths under each form.

Limit display to the most relevant 5–10 results.

Result Structure

Each result must include:

Generic drug name

Strength

Dosage form

High-level description (e.g., “Amoxicillin 400 mg/5 mL Oral Suspension”)

Clear status badges (Active, Common, Pediatric, etc.)

Interaction Requirements

Selecting a result takes the user to the NDC selection and calculator screen.

Users may expand to see more results under each dosage form.

6.3 Advanced Table Mode Requirements
Activation

Must be accessible via a button or link labeled:
“View All NDCs (Advanced)”
without disrupting the simple mode.

Table Requirements

The table must:

Display all corresponding NDC-labeled products (active + inactive)

Show sortable columns, including:

Brand Name

Generic Name

Strength

Dosage Form

Package Size

Manufacturer

NDC

Status (Active / Inactive / Discontinued)

Support filters for:

Active only

Strength

Dosage form

Manufacturer

Provide pagination or infinite scrolling depending on volume.

Interaction Requirements

Clicking a table row selects that item and opens the calculator.

The table should remain visible until deliberately closed.

Must persist search term and filters when transitioning back and forth.

6.4 Result States & Error Handling Requirements
Valid States

Active formulations found

Only inactive formulations available

Drug exists clinically but has no FDA-listed NDCs

No matching drug found

Messaging Requirements

Must use clear, clinician-oriented language.

Must never imply the drug “does not exist” unless no clinical drug is found.

Must differentiate between:

“No FDA-listed NDCs available”

“Strength not marketed in the US”

“Expired / discontinued product”

6.5 Performance Requirements

Search results must display < 300 ms for cached queries.

Full table must load < 2 seconds for up to 300 rows.

Sorting and filtering must feel immediate (< 150 ms).

7. Non-Functional Requirements
Usability

Must match pharmacist mental models (structured, predictable, sortable tables).

Must preserve simplicity for non-clinical users.

Must support keyboard navigation.

Visual Design

Must visually separate simple vs. advanced modes.

Table layout must emulate familiar pharmacy systems without appearing outdated.

Badges should be used for status clarity.

Compliance

Must avoid displaying sensitive or patient-identifying data.

Must align with healthcare accuracy expectations (zero tolerance for ambiguous representation).

8. Out of Scope

Inventory tracking or “on hand” management

Pricing, plan coverage, or adjudication

Integration with dispensing workflows

Medication images

9. Risks & Mitigations
Risk	Description	Mitigation
Too many results still overwhelm users	Some drugs (e.g., metformin) have 100+ NDC entries	Dual-mode UI reduces clutter in default view
Inconsistent data between FDA & RxNorm	May cause missing or mismatched items	Introduce clear messaging for unavailable NDCs
Pharmacists rely on manufacturer names	Without table view, they cannot verify	Manufacturer column included in full table
Non-pharmacists confused by clinical details	Table is optional and collapsible	Keep simple view extremely clean
10. Future Enhancements (Not included in this PRD)

Fuzzy matching for misspellings

Favorite drugs list

Recently selected medications

Local pharmacy formulary mode

Integration with inventory systems