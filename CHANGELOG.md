# Changelog

## Unreleased - FASTER deployment baseline (2026-11-19)

- Renamed the project **FASTER** (Framework for Accessible, Secure, Traceable, Evidence-based Review); the product remains the Repository Review Assistant.
- Relicensed original code and original questions from MIT to **AGPL-3.0-only**; added `NOTICE`, a source-offer link in the site footer and deployment guidance.
- Added a pull-request `Check` workflow and made the GitHub Pages deploy depend on `npm run check`.
- Added `docs/DEPLOYMENT.md` for GitHub Pages, AGPL section 13, custom domains and the deferred Cloudflare MCP service.
- Recorded the Phase 0 audit in `docs/BASELINE.md`; no Phase 0 accessibility or discovery fixes are included in this change.

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
