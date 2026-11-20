# Roadmap with testable milestones

## Implemented baseline, v0.2

- [x] Generic public GitHub intake with optional branch/tag/SHA, document path and target type.
- [x] Default general pack, optional W3C draft pack, 42 total original exploratory questions across both packs.
- [x] Bounded source, issue and PR discovery; line-level candidate snippets with source links.
- [x] Draft answers, human rationale, separate AI proposals, Markdown/JSON export, saved-review import.
- [x] Read-only draft WebMCP integration with no-AI normal-browser fallback.
- [x] Data validation and 32 unit tests.

## Phase 0 remediation (2026-11-19)

- [x] Answer changes keep keyboard focus; the results heading receives focus after a scan.
- [x] Muted text meets WCAG 1.4.3 in light and dark themes; 320 px reflow no longer overflows.
- [x] Extensionless `README`/`LICENSE`/`CHANGELOG` and common text formats are discovered.
- [x] Analysis stops with guidance when no reviewable document is found.
- [x] Review packs carry an explicit version through UI, JSON, Markdown and WebMCP.
- [x] Evidence rule merging, discussion-aware evidence diversity, and structurally bounded AI prompts.
- [x] Reviewer identity, decision timestamps/origin and strict saved-review validation.
- [x] AI proposals bound to repository, commit and pack version; cross-review application blocked.
- [x] Mocked GitHub adapter tests and bounded 429/403/5xx retry behaviour.
- [ ] Remaining baseline findings F8 (semantic matching), F13 (DOM integration) and F16 (cache).

## Phase 1 discovery (2026-11-20)

- [x] Discovery returns a ranked inventory with selected/skipped counts, sizes, reasons and truncation warnings.
- [x] Reviewer selects up to 16 documents; implementation code is sampled up to 4 files.
- [x] Transparent project-type suggestion with an explicit "Use suggested type" action (never auto-confirmed).
- [x] Repository metadata (description, topics, license, language, archived, default branch) and API budget.
- [x] Issue/PR labels, timestamps and verified merged status carried into evidence.
- [ ] Canonical/published document discovery and monorepo subdirectory scoping.
- [ ] Preliminary Django pilot recorded with 25 AI-assisted labels (70% precision, 74% recall); independent human confirmation pending.

## Deployment baseline (2026-11-19)

- [x] GitHub Pages deployment through Actions, gated by `npm run check`.
- [x] AGPL-3.0-only licensing, `NOTICE`, and a visible Corresponding Source link.
- [x] Documented deployment, custom-domain and source-offer requirements.
- [ ] Optional Cloudflare remote MCP service (Phase 6, not a Pages backup).

## Milestone 1: Remaining discovery hardening

- [ ] Canonical and published-document detection, including ReSpec/Bikeshed output.
- [ ] Monorepo subdirectory scoping and multiple target roots.
- [ ] Better GitHub rate-limit retry/cache handling; the current UI shows the remaining budget.
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
