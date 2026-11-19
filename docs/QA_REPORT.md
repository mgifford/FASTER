# Quality assurance record for consolidated starter v0.2.0

Date: 2026-11-19

## Verified

- `npm run validate`: both review packs valid; general pack 6 areas, 20 questions, 20 rules; W3C draft pack 6 areas, 22 questions, 22 rules.
- `npm test`: **18 tests passed** covering URL/ref validation, deterministic candidate extraction, immutable file citations, decision/proposal separation, document path safety, data exports, pack authority labeling, pack-version consistency, extensionless-document discovery and optional WebMCP tool contracts.
- HTML structural static check: 39 unique element IDs, no unmatched `label for` attributes, linked module exists.
- Local HTTP smoke check: `index.html`, JS modules, pack registry and both question-pack JSON files returned status 200 with non-empty bodies.
- JavaScript syntax checks: entry modules and core API code parsed successfully with Node.

## Post-audit verification (2026-11-19, after Phase 0 fixes in PR #1)

- Node 22.20.0: `npm run check` passes, 18/18 tests, both packs validate with versions.
- Headless Chrome 157.0.8103.79 with axe-core 4.10.3: intake and post-scan axe runs report **0 violations**.
- 320 CSS px emulation: `scrollWidth` equals `clientWidth` (320); the file input no longer overflows.
- Keyboard check via CDP: changing an answer keeps focus on `answer-ACC-001`; changing a rationale keeps focus on `why-ACC-001`; a completed scan moves focus to `results-heading`.
- Extensionless-document check: `octocat/Hello-World` (`README` with no extension) now analyses 1 document instead of 0.
- No-document gate: a mocked GitHub tree containing only `index.js` stopped with the "No reviewable documents" guidance and rendered zero questions.
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
- User-selected target type is recorded, but automatic project classification and full document-selection workflow are not implemented.

See `docs/VALIDATION_PLAN.md` for future real-repo pilots, accessibility testing and evidence-quality metrics.
