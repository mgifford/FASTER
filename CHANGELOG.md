# Changelog

## Unreleased - FASTER deployment baseline (2026-11-19)

- Renamed the project **FASTER** (Framework for Accessible, Secure, Traceable, Evidence-based Review); the product remains the Repository Review Assistant.
- Relicensed original code and original questions from MIT to **AGPL-3.0-only**; added `NOTICE`, a source-offer link in the site footer and deployment guidance.
- Added a pull-request `Check` workflow and made the GitHub Pages deploy depend on `npm run check`.
- Added `docs/DEPLOYMENT.md` for GitHub Pages, AGPL section 13, custom domains and the deferred Cloudflare MCP service.
- Recorded the Phase 0 audit in `docs/BASELINE.md`.
- Fixed Phase 0 blockers F1-F5: answer changes keep keyboard focus and scans focus the results heading; muted text uses a contrast-safe adaptive token; the file input no longer overflows at 320 CSS px; extensionless `README`/`LICENSE`/`CHANGELOG` and more text formats are discovered; analysis stops with guidance when no reviewable document exists; review packs carry an explicit version through UI, JSON, Markdown and WebMCP.
- Added a two-step discovery flow: repository metadata and API budget, a ranked document inventory with selected/skipped counts and reasons, explicit project-type suggestion/confirmation, and a 16-document selector before analysis.
- Added issue/PR labels, timestamps and verified merged state to evidence; added retrieval timestamps and inventory coverage to the review record and Markdown export.
- Merged multiple rules per question, round-robined evidence across documents/discussions/code, and replaced AI-prompt slicing with a structurally bounded, valid JSON bundle.
- Replaced substring matching with word-boundary terms, NFKC normalization and a possible-negation hint.
- Added strict saved-review validation and bound AI proposals to repository, commit and pack version; mismatched suggestions cannot be applied.
- Added optional reviewer identity, decision timestamps and decision origin to reviews and Markdown exports.
- Added bounded retries for 429/403/5xx GitHub responses with reset guidance, low-budget warnings and mocked adapter tests.
- Added bounded in-memory tree/blob caching by immutable SHA.
- Added an optional monorepo subdirectory scope and displayed issue/PR labels and dates with evidence.
- Added Markdown/HTML section context, possible-normative hints, contradiction hints, snippet deduplication and the repository homepage link.
- Added candidate canonical/documentation link extraction from selected sources; links are unverified and never fetched automatically.
- Added an offline, model-neutral evidence/AI-proposal evaluation CLI with a recorded Django review/label fixture; no Cloudflare or model API is required.
- Expanded the test suite from 12 to 43 tests, including UI/contrast/reflow guards, pack-version consistency, inventory/type suggestions, evidence diversity and AI-prompt bounds.

## 0.2.0 - Generic-first consolidation (2026-11-19)

- Reframed the application from W3C-first horizontal self-review to generic GitHub repository review.
- Added general default pack (20 questions/rules), retained optional W3C draft pack (22 questions/rules).
- Added target type, review goal and priority document inputs, plus default-branch handling.
- Added bounded PR retrieval alongside existing issues, source and optional code samples.
- Preserved provenance metadata, separate AI proposals, human decisions, exports, read-only browser WebMCP.
- Expanded data validation and test coverage from 6 to 12 Node tests.
- Consolidated implementation guidance and project documentation in the distributable ZIP.

## 0.1.0 - Initial W3C-aligned static prototype

- Built static GitHub repository scan, draft evidence discovery, review decisions and exports.
