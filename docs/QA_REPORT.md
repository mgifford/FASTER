# Quality assurance record for consolidated starter v0.2.0

Date: 2026-11-20

## Verified

- `npm run validate`: both review packs valid; general pack 6 areas, 20 questions, 20 rules; W3C draft pack 6 areas, 22 questions, 22 rules.
- `npm test`: **41 tests passed** covering URL/ref validation, deterministic candidate extraction, immutable file citations, decision/proposal separation, document path safety, data exports, pack authority labeling, pack-version consistency, extensionless-document discovery, inventory/type-suggestion logic, word-boundary matching, rule merging, evidence diversity, AI-prompt bounds, saved-review validation, decision provenance, mocked GitHub discovery/retrieval/retry, scoped inventory, evidence history metadata, section/normative/contradiction hints, snippet deduplication, offline evidence evaluation and optional WebMCP tool contracts.
- HTML structural static check: 58 unique element IDs, no unmatched `label for` attributes, linked module exists.
- Local HTTP smoke check: `index.html`, JS modules, pack registry and both question-pack JSON files returned status 200 with non-empty bodies.
- JavaScript syntax checks: entry modules and core API code parsed successfully with Node.

## Post-audit verification (2026-11-20, after Phase 0 and Phase 1 discovery work)

- Node 22.20.0: `npm run check` passes, 41/41 tests, both packs validate with versions.
- Headless Chrome 157.0.8103.79 with axe-core 4.10.3: intake and post-scan axe runs report **0 violations**.
- 320 CSS px emulation: `scrollWidth` equals `clientWidth` (320); the file input no longer overflows.
- Keyboard check via CDP: changing an answer keeps focus on `answer-ACC-001`; changing a rationale keeps focus on `why-ACC-001`; a completed scan moves focus to `results-heading`.
- Extensionless-document check: `octocat/Hello-World` (`README` with no extension) now analyses 1 document instead of 0.
- No-document gate: a mocked GitHub tree containing only `index.js` shows the "No reviewable documents" guidance, disables analysis and leaves results hidden.
- Phase 1 inventory: `chalk/chalk` discovery reported 35 discovered files, 5 documents, 23 code files, 7 skipped; it suggested `library`, applied it explicitly, selected 5 documents and 4 code files.
- Phase 1 analysis: the selected sources produced 36 evidence candidates in the verification run before the F8 word-boundary change, 20 questions and 0 automatic decisions; focus moved to `results-heading`, axe reported 0 violations, and both inventory and results fit 320 CSS px.
- Issue/PR evidence now carries labels, timestamps, and verified merged vs. closed-unmerged state.
- Preliminary pilot: Django at `c67d872…` with 25 AI-assisted labels, 70% precision and 74% recall; see `docs/PILOT.md`. Human confirmation is pending.
- Provenance: a reviewer name and decision origin render in the question card; a saved review with a non-GitHub evidence URL or unknown AI evidence is rejected; a mocked 429 retry succeeds and a 403 primary rate limit reports reset guidance.
- Evaluation: `npm run evaluate` reproduces 70.0% precision and 73.7% recall against the 25 AI-assisted Django labels; invalid AI bindings/evidence are reported without changing human decisions.
- Monorepo scope: a mocked `docs` scope discovered only 2 documents and 0 code files; the inventory and results reported the scope and fit 320 CSS px.
- History metadata: issue/PR evidence displayed `labels: privacy`/`security` and created dates from the mocked API.
- Pack version check: the review summary and Markdown export record `v0.2.0`.

## Not verified

- Live public GitHub REST API retrieval under quota exhaustion, private repositories or changed/renamed repositories; the normal live scans did succeed.
- Assistive technology tests (VoiceOver, NVDA, JAWS, etc.), manual WCAG assessment or production security review.
- In-browser WebMCP availability; only feature-detection fallback and mock registration/execution tests were completed.
- Actual LLM inference or remote conventional MCP, neither of which is implemented.

## Known limitations

- Bounded sampling, not comprehensive crawling; candidate-only keyword matching can produce false positives and miss evidence.
- Issues and PRs are mutable source discussions; exact source file SHA is pinned but discussion snapshot reproducibility is incomplete.
- W3C starter questions are original triage prompts, not full official questionnaires. Sustainability is experimental.
- Project type is suggested from repository evidence and requires explicit confirmation; canonical/published-document detection and monorepo scoping remain unimplemented.

See `docs/VALIDATION_PLAN.md` for future real-repo pilots, accessibility testing and evidence-quality metrics.
