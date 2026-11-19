# Roadmap with testable milestones

## Implemented baseline, v0.2

- [x] Generic public GitHub intake with optional branch/tag/SHA, document path and target type.
- [x] Default general pack, optional W3C draft pack, 42 total original exploratory questions across both packs.
- [x] Bounded source, issue and PR discovery; line-level candidate snippets with source links.
- [x] Draft answers, human rationale, separate AI proposals, Markdown/JSON export, saved-review import.
- [x] Read-only draft WebMCP integration with no-AI normal-browser fallback.
- [x] Data validation and 18 unit tests.

## Phase 0 remediation (2026-11-19)

- [x] Answer changes keep keyboard focus; the results heading receives focus after a scan.
- [x] Muted text meets WCAG 1.4.3 in light and dark themes; 320 px reflow no longer overflows.
- [x] Extensionless `README`/`LICENSE`/`CHANGELOG` and common text formats are discovered.
- [x] Analysis stops with guidance when no reviewable document is found.
- [x] Review packs carry an immutable version through UI, JSON, Markdown and WebMCP.
- [ ] Remaining baseline findings F6-F16 (evidence caps, rule merging, inventory, provenance).

## Deployment baseline (2026-11-19)

- [x] GitHub Pages deployment through Actions, gated by `npm run check`.
- [x] AGPL-3.0-only licensing, `NOTICE`, and a visible Corresponding Source link.
- [x] Documented deployment, custom-domain and source-offer requirements.
- [ ] Optional Cloudflare remote MCP service (Phase 6, not a Pages backup).

## Milestone 1: Real document discovery

- [ ] Project kind detection with explicit reviewer confirmation.
- [ ] Inventory of source, generated and published documents; reviewer selects relevant targets.
- [ ] Better GitHub rate-limit handling and visible coverage report.
- [ ] Integration tests against non-W3C public project snapshots.
- [ ] Full browser keyboard/zoom/forced-colors manual review.

## Milestone 2: Evidence quality

- [ ] Structured Markdown/HTML/ReSpec/Bikeshed parsers with headings and normative/informative designation.
- [ ] Distinguish code behavior from specification requirements, PR proposals from merged changes, and absence from failure.
- [ ] Evidence graph: passages -> questions -> decisions -> citations, with counterevidence.
- [ ] Human-published reference fixture set and precision/recall evaluations.

## Milestone 3: Questionnaire ecosystem

- [ ] First externally versioned review pack, with citations, licensing, original IDs and review status.
- [ ] General-purpose plugin loader and pack validation tests.
- [ ] Separation between context-specific prompts and generic reusable review evidence.
- [ ] Real W3C questionnaire import where licensed/appropriate; experimental sustainability pack separately governed.

## Milestone 4: BYO AI and WebMCP

- [ ] Expanded read-only browser tools and optional model adapters.
- [ ] Provider-neutral input/output, cited provenance, human confirmation and prompt-injection testing.
- [ ] Explain data/energy cost of optional local browser model downloads; avoid hidden paid API calls.

## Milestone 5: Review continuity

- [ ] Diff evidence and decisions across commits, releases and pack versions.
- [ ] Invalidate previously approved conclusions when supporting evidence changes.
- [ ] Exports compatible with issues, review systems and later OpenACR when appropriate, **without conflating report types**.

## Milestone 6: Remote MCP and additional sources

- [ ] Authenticated caching backend only if scaling and use cases justify it.
- [ ] Conventional remote MCP separate from browser WebMCP.
- [ ] Additional repository and document sources, properly permissioned and tested.

Each milestone should deliver a runnable state, documented limitations, measured test results and no automatic fabricated conformance claims.
