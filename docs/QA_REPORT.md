# Quality assurance record for consolidated starter v0.2.0

Date: 2026-11-19

## Verified

- `npm run validate`: both review packs valid; general pack 6 areas, 20 questions, 20 rules; W3C draft pack 6 areas, 22 questions, 22 rules.
- `npm test`: **12 tests passed** covering URL/ref validation, deterministic candidate extraction, immutable file citations, decision/proposal separation, document path safety, data exports, pack authority labeling and optional WebMCP tool contracts.
- HTML structural static check: 39 unique element IDs, no unmatched `label for` attributes, linked module exists.
- Local HTTP smoke check: `index.html`, JS modules, pack registry and both question-pack JSON files returned status 200 with non-empty bodies.
- JavaScript syntax checks: entry modules and core API code parsed successfully with Node.

## Not verified

- End-to-end browser execution of a live GitHub review. A Chromium headless invocation stalled in this container, so screenshots and full interactive browser validation are **not claimed**.
- Live public GitHub REST API retrieval and actual API quota behavior. Real request results depend on CORS, rate limits and repo state at runtime.
- Assistive technology tests (VoiceOver, NVDA, JAWS, etc.), manual WCAG assessment or production security review.
- In-browser WebMCP availability; only feature-detection fallback and mock registration/execution tests were completed.
- Actual LLM inference or remote conventional MCP, neither of which is implemented.

## Known limitations

- Bounded sampling, not comprehensive crawling; candidate-only keyword matching can produce false positives and miss evidence.
- Issues and PRs are mutable source discussions; exact source file SHA is pinned but discussion snapshot reproducibility is incomplete.
- W3C starter questions are original triage prompts, not full official questionnaires. Sustainability is experimental.
- User-selected target type is recorded, but automatic project classification and full document-selection workflow are not implemented.

See `docs/VALIDATION_PLAN.md` for future real-repo pilots, accessibility testing and evidence-quality metrics.
