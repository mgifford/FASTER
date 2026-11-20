# Phase 0 baseline audit and code review

Date: 2026-11-19
Reviewer: AI coding agent (lead)
Status: **review complete; Phase 0 findings recorded; F1-F7, F9, F14 and F15 remediated; Phase 1 discovery implemented and a preliminary pilot recorded. Human label confirmation is pending. No runtime code changed during the audit.**

> **Post-audit updates (2026-11-19):** the project is now a git repository at
> `https://github.com/mgifford/FASTER`, licensed **AGPL-3.0-only** (it was MIT during the
> audit), with a CI check workflow and `docs/DEPLOYMENT.md`. The findings below still describe
> the audited v0.2 code; only the VCS and license notes are now historical. The F1-F5 fixes
> landed in pull request #1 (commit `3adafd0`). See `CHANGELOG.md`.

### Remediation status (post-audit)

| Finding | Status | Evidence |
| --- | --- | --- |
| F1 focus loss / no focus after scan | **Fixed** | `src/main.js` updates one card in place and focuses `#results-heading`; CDP check retained `answer-ACC-001` and `why-ACC-001` focus. |
| F2 contrast | **Fixed** | `--muted` now uses `color-mix(in srgb,CanvasText 65%,Canvas)`; axe reports 0 violations on intake and results. |
| F3 320 px reflow | **Fixed** | File input is width-constrained; `scrollWidth` equals `clientWidth` at 320 px. |
| F4 extensionless docs / no-document gate | **Fixed** | Extensionless `README`, `LICENSE`, `CHANGELOG` etc. and more formats are discovered; `hasReviewableDocuments()` stops analysis with guidance when none are found. |
| F5 pack version | **Fixed** | `version` is required in the registry/validator and carried through UI, JSON, Markdown and WebMCP. |
| F6 multiple rules per question | **Fixed** | Phrases are merged per question; regression test added. |
| F7 evidence cap starves discussion | **Fixed** | Round-robin document/discussion/code selection, with a discussion slot when present; regression test added. |
| F8 substring matching false positives | **Partial** | Word-boundary terms, NFKC normalization, section context, possible-normative/negation/contradiction hints and snippet deduplication are implemented; semantic/generic-word ambiguity remains Phase 2 work. The pilot predates these changes. |
| F9 AI prompt truncation | **Fixed** | Structurally bounded evidence bundle, valid JSON, prompt warnings and omitted counts; test covers 1,000 questions. |
| F10 inventory not visible | **Fixed** | Discovery renders selected/skipped counts, sizes, reasons, skipped-file limits and a 16-document selector. |
| F11 preflight metadata/type suggestion | **Partial** | Metadata, API budget, an explicit type suggestion/confirmation and monorepo subdirectory scope are implemented; canonical/published-doc detection is not. |
| F12 issue/PR provenance | **Partial** | Labels, dates, verified merged status and the repository homepage are carried/displayed; comment links, claim comparison and a dedicated history view remain. |
| F13 test coverage / CI | **Partial** | 41 tests plus CI, including a mocked GitHub adapter, scoped inventory, evidence-context fixtures and an offline evaluation harness; no DOM integration browser fixture yet. |
| F14 imported-data binding | **Fixed** | Saved reviews are strictly validated; AI proposals carry a repository/commit/pack binding and mismatched proposals cannot be applied. |
| F15 decision provenance | **Fixed** | Optional reviewer name, decision timestamp and `human`/`ai-accepted` origin are recorded in the review, cards and Markdown. Sign-off remains a future state. |
| F16 rate limits/retry | **Partial** | API budget is displayed, pack switching is guarded, bounded 429/403/5xx retries and a bounded in-memory SHA cache are implemented; no persistent/server cache or full secondary-limit backoff. |


This document is the Phase 0 artifact requested by `docs/IMPLEMENTATION_PROMPT.md` §4 and
`HANDOFF_PROMPT.md`. It records what was inspected, what was actually tested, what passed,
what is broken, and what must be fixed before the Phase 1 discovery milestone can be
accepted.

## 1. Scope and method

Reviewed in full:

- `START_HERE.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `HANDOFF_PROMPT.md`
- all files in `docs/`, `src/`, `data/`, `tests/`, `scripts/`, `examples/`, `.github/`
- `index.html`, `styles.css`, `package.json`, `LICENSE`

The two attached prompt files were compared with the repository copies:

- `FASTER - Repository_Review_Assistant_Implementation_Prompt.md` is byte-identical to
  `docs/IMPLEMENTATION_PROMPT.md`.
- `FASTER - Repository_Review_Assistant_Handoff_Prompt.md` is byte-identical to
  `HANDOFF_PROMPT.md`.

Method:

1. Ran `npm run check` before making any change and recorded the result and environment.
2. Read every source module and data pack; traced each claim in `README.md` and
   `docs/QA_REPORT.md` to code or data where possible.
3. Served the site over HTTP and ran real headless-Chrome scans against public, non-W3C
   repositories. Captured pinned SHAs, selected files, evidence URLs, API request counts,
   limitations, and failures.
4. Injected axe-core 4.10.3 into the live page and ran WCAG scans on the intake and results
   states, in light and dark colour schemes.
5. Exercised keyboard/focus behaviour and a 320 CSS px viewport through the Chrome DevTools
   Protocol (CDP), not by visual inspection alone.
6. Wrote small Node probes against the pure modules to test pack-rule handling, evidence
   caps, extensionless documents, validation edge cases, and AI-prompt size.
7. Read the current WebMCP Community Group draft (19 November 2026) and the W3C horizontal
   groups page to check the API shape and the five-area/experimental-sustainability framing.
8. Verified GitHub API CORS and ref handling with direct requests.

Environment and tools:

| Item | Value |
| --- | --- |
| OS | macOS 27.2.1 (build 26B131), arm64 |
| Node | v22.20.0 |
| npm | 11.18.0 |
| Browser | Headless Google Chrome 157.0.8103.79 |
| Accessibility engine | axe-core 4.10.3 (injected; `@axe-core/cli`/`pa11y-ci` installation) |
| Server | `python3 -m http.server` on `127.0.0.1:8765` |
| Project VCS | none during the audit; git repository now at `github.com/mgifford/FASTER` (post-audit) |

Because there is no git history, the baseline is identified by content hashes. The combined
SHA-256 of the 18-file manifest of `index.html`, `styles.css`, `package.json`, all `src/*.js`,
`data/presets.json`, all `data/packs/*/*.json`, `scripts/validate-data.mjs`, and
`tests/*.mjs` is:

```text
d736025412d4fc5cf79016b9aafab7b0c967b23b23e074f3f3f4a31e10e9d051
```

## 2. Gate results

### `npm run check` — PASS

```text
general: valid 6 areas, 20 questions, 20 rules.
w3c-horizontal-starter: valid 6 areas, 22 questions, 22 rules.

# tests 12
# pass 12
# fail 0
```

The data validator and all 12 Node tests passed at audit time (the suite now has 41 tests after the Phase 0, Phase 1, provenance, evaluation and evidence-context tests). This matched the `README.md` claim of 12 tests, but not the then-stale `docs/ROADMAP.md` (see F18).

### Tests that were not in the repository

The passing suite does **not** include tests for the GitHub adapter (`src/github.js`), the DOM
controller (`src/main.js`), saved-review import, negative statements, oversized files, rate
limits, prompt injection, truncation, or evidence caps. Those gaps are findings, not
deductions from the green suite. See F13.

## 3. End-to-end evidence (real repositories)

These scans were run in headless Chrome through the real UI, including all GitHub requests.

| Repository | Pinned SHA | Result | API requests |
| --- | --- | --- | --- |
| `chalk/chalk` | `72110019e147683f60e13fa0ff5c14a0c27cd9fe` | 4 source files, 23 issue/PR discussions, 33 evidence candidates, 20 questions, 0 human-reviewed | 9 |
| `octocat/Hello-World` | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` | **0 source files**, 21 discussions, 3 evidence candidates | 6 |
| `sindresorhus/is-odd` | n/a (API 404) | Error shown: "GitHub API returned 404"; no results section; scan re-enabled | 1 |

The `chalk/chalk` scan proves that the core path works: metadata → commit → tree → bounded
blobs → issues/PRs → candidate evidence → draft review → SHA-pinned links. Examples of
generated links:

- `https://github.com/chalk/chalk/blob/72110019e147683f60e13fa0ff5c14a0c27cd9fe/.github/security.md#L3`
- `https://github.com/chalk/chalk/blob/72110019e147683f60e13fa0ff5c14a0c27cd9fe/readme.md#L296`

The `octocat/Hello-World` scan is important because it is the repository used in the
`README.md` quick start. Its only file is `README` (no extension, 13 bytes), which
`detectFileType()` does not recognise, so the tool analyses zero documents and still presents
20 questions. That is finding F4.

CORS is not a blocker. The preflight for `X-GitHub-Api-Version` returned 204 with
`access-control-allow-origin: *` and the header allowed. Percent-encoded refs such as
`refs%2Fheads%2Fmain` also resolve to the same commit as unencoded refs.

### WebMCP

The implementation matches the current draft API shape:

- feature detection through `document.modelContext.registerTool` (`src/webmcp.js:7`);
- `registerTool(tool, {signal})` with a registration `AbortController` (`src/webmcp.js:54`);
- `annotations: {readOnlyHint, untrustedContentHint}` (`src/webmcp.js:15,24,35,46`);
- JSON-Schema `inputSchema` objects and JSON-serialisable return values.

Chrome 157 on this machine does not expose `document.modelContext`, so the site correctly
reported "WebMCP unavailable" and remained usable. No real WebMCP-capable browser was
available; only the mocked registration/execution tests ran. The draft date in
`docs/AI_AND_MCP.md` was stale at audit time ("13 November 2026"); it was updated to the
fetched 19 November 2026 draft after the audit.

### W3C framing

The W3C horizontal groups page states that there are five W3C horizontal groups as of June
2026 (APA, i18n, Privacy, Security, TAG). The repository's five-formal-areas-plus-experimental-
sustainability model matches that, and `scripts/validate-data.mjs` enforces it. The W3C pack
remains optional and the general pack remains the default.

## 4. Phase 0 checklist against the prompt

| Prompt §4 item | Result | Evidence |
| --- | --- | --- |
| Inspect layout, scripts, pack schemas | Done by this audit | all files read; validator output above |
| Run `npm run check`, record environment | Pass; environment in §1 | `npm run check` 12/12 |
| Keyboard, labels, live status, zoom, forced colours, reduced motion; record what was tested | **Partial / fail** | axe contrast failures, focus loss, 320 px overflow; no screen-reader test; forced-colours only visual |
| Inspect GitHub API usage: rate limits, oversampling, mutability, failures, max bytes/requests, malformed paths | **Partial** | bounds in code; max 25 requests, ~2.8 MB decoded docs; no preflight budget; 404/closed handling observed; see F11 |
| Check WebMCP against current CG draft | **Pass on API shape**, no real browser | `src/webmcp.js`; draft 2026-11-19; docs date stale |
| Enumerate limitations in `docs/BASELINE.md`; update changelog | **This file created**; changelog intentionally unchanged (no runtime change) | — |
| Do not re-implement working components | Pass | no framework/dependency added |

Phase 0 acceptance is not yet met because the UI accessibility checks in item 3 fail or are
unrecorded. The functional acceptance sentence ("tests pass, an ordinary public repo can be
entered, exploratory evidence is distinct from decisions") is substantially met: the
distinctions are visible (candidate evidence, draft status, "Human reviewed", unapproved AI
proposals), but the quick-start repository is one that yields no documents.

## 5. Findings

Severity: **High** = Phase 0/1 acceptance blocker, WCAG AA failure, or provenance contract
violation; **Medium** = correctness/coverage/robustness issue; **Low** = documentation drift or
minor UX.

### High

**F1. Changing any review answer destroys focus and re-renders the whole question list.**
`replaceQuestion()` (`src/main.js:174`) calls `renderQuestions()`, which clears `#questions`
with `replaceChildren()` (`src/main.js:139`). The `change` handlers for the answer select
(`src/main.js:168`) and the rationale textarea (`src/main.js:170`) both use it. In a live CDP
test, changing `answer-ACC-001` from "Needs investigation" to "Met" left
`document.activeElement` as `BODY` and re-announced the counts live region. All expanded
`<details>` elements also collapse. A keyboard user must tab from the top of the page through
up to 20 cards again. This contradicts the project's own UX acceptance ("Focus moves
deliberately after scans, errors and imports") and is a serious 2.4.3 focus-order risk.
The same gap exists after a scan: `showReview()` (`src/main.js:111-122`) reveals the results
section without moving focus or announcing a destination; a real click leaves focus on the
Analyze button, above the results, and the programmatic submit test left it on `BODY`. The
polite live region reports the file count, but does not tell a keyboard or screen-reader user
where the review is or how to reach it. Fix direction: update only the affected card, or
re-render and restore focus by ID plus `details` state; do not rebuild the list on every
answer; move focus to the results heading (with `tabindex="-1"`) after a successful scan.

**F2. Help and metadata text fails WCAG 1.4.3 contrast in the default light theme.**
`styles.css:1` defines `--muted: GrayText`. In light mode Chrome computes `#808080` on
`#ffffff` (14.72 px normal-weight text), which axe measured at **3.94:1** against
the required 4.5:1. Axe reported 7 nodes on intake and **49 nodes after a scan** (all `.help`
and `.meta` text, including the snapshot label and per-question provenance). Dark mode
passes axe on the intake state (no violations). This is a real AA failure in the default theme, not a colour-only
cosmetic issue. Fix direction: choose a muted token with ≥4.5:1 in both themes (e.g. a
content colour around `#595959` on Canvas) and keep the dark value compliant.

**F3. The page does not reflow at 320 CSS px because of the file input.**
At `width: 320` (the 400 % zoom equivalent for a 1280 px viewport), the document
`scrollWidth` was **369** against `clientWidth` **320**. The overflowing element is
`#load-review` (`index.html:69`), a file input measuring **333 px**. The CSS width rule
(`styles.css:1`) covers `input[type=url]`, `text`, `search`, `:not([type])`, `select` and
`textarea`, but not `input[type=file]`. This is a WCAG 1.4.10 reflow failure. The 320 px
screenshot shows the right edge clipped. Fix direction: `input[type=file] { max-width: 100% }`
(or make all inputs `max-width: 100%` with `min-width: 0` on grid items), then retest.

**F4. The quick-start example produces zero documents, with no "no document" prompt.**
`README.md:18` tells users to try `https://github.com/octocat/Hello-World`. That repository's
only file is `README` (no extension). `detectFileType()` (`src/review-core.js:37-42`) returns
`null` for extensionless files, and `selectFiles()` (`src/review-core.js:44-59`) silently
drops them. The live scan reported "Analyzed 0 source files and 21 issue/PR discussions",
stored no document warning, and still displayed all 20 questions. Phase 1 §5.2 requires:
"If no document can be identified, ask the reviewer, don't fabricate a target." The same
blind spot excludes `LICENSE`, `CHANGELOG`, `AGENTS`, `Makefile`, `Dockerfile`, and `.adoc` /
`.org` / `.ipynb` documents, which are common in non-W3C repositories.
Fix direction: recognise extensionless conventional documents and additional text formats;
when the selected document set is empty, stop and ask the reviewer to choose a path; record
the empty inventory as a warning, not just a status line.

**F5. The review does not preserve the question-pack version.**
`data/presets.json` has no `version`; `newReview()` stores only
`{id, title, kind, status}` (`src/review-core.js:111`); `toMarkdown()` prints only those
fields (`src/review-core.js:167`); WebMCP's overview returns the same object. The individual
pack files do carry `version` (`data/packs/*/questions.json`), but it never reaches the
review or export. `AGENTS.md` explicitly says to preserve "question-pack version", and Phase 3
requires it in every export. A 2026 review cannot be reproduced against the pack that produced
it. Fix direction: add `version` (and eventually license/source organisation) to the registry
entry and to `review.preset`; surface it in UI, Markdown, JSON, and WebMCP.

### Medium

**F6. Multiple rules for the same question silently collapse to the last rule.**
`findEvidence()` builds `new Map(rules.map(r => [r.questionId, r]))`
(`src/review-core.js:66`), so only the last rule per question is used. `scripts/validate-data.mjs`
permits multiple rules per question. A Node probe with two rules (`alpha`, `beta`) reported only
`beta`. Current packs happen to have one rule per question, so this is latent, not currently
observable; it will break the first pack that splits phrases across rules. Fix: use an array or
merge phrases per question, and add a test.

**F7. The per-question cap starves issue/PR evidence.**
`findEvidence()` iterates files first and stops at six matches per question
(`src/review-core.js:76,97`). A probe with ten document lines and one matching, contradictory
issue produced **6 document candidates and 0 issue candidates**. Because counterevidence is a
core product goal, a well-documented question can systematically hide the issue that disputes
the documentation. Fix: cap per source type, or round-robin across document/code/discussion
sources, and preserve at least one discussion candidate when one exists.

**F8. Keyword matching is substring-only and produces obvious false positives.**
`normalized(content).includes(term)` (`src/review-core.js:82`) has no word boundaries or
Unicode normalisation. A probe with the ARC-001 phrase `api` matched "capital" and "rapid".
The current packs also use broad stems such as `identif`, `compatib`, `accessib`, and
`api`. The UI correctly labels matches as candidates, but the first six matches are shown
as if they were the most relevant, and the cap hides better material. Phase 2 is the place
for structured matching; until then, document this limitation more prominently and consider
word-boundary/term-quality guards.

**F9. The AI prompt is truncated in the middle of JSON.**
`toAIPrompt()` slices the serialised data at 120 000 characters
(`src/review-core.js:197`). `loadSavedReview()` accepts up to 1 000 questions
(`src/main.js:191`). A probe with 1 000 questions produced a 120 000-character data section
that failed `JSON.parse` with "Unterminated string". The model would receive malformed data
and the documented "return only a JSON array" contract would be impossible to satisfy.
A realistic 22-question × 6-evidence review stayed under the cap (about 106 000 characters),
so this is currently reachable through imported reviews rather than normal scans. Fix:
truncate structurally (drop evidence/questions with an explicit truncation notice), or cap
question count before building the prompt; never slice serialised JSON.

**F10. The document inventory is not visible or explainable.**
`review.scope.filesInspected` is exported, but the results UI shows only the count and two
generic limitations (`src/main.js:115,120`). There is no list of selected files, no
discovered/selected/skipped/unknown counts, no per-file selection reason, and no warning for
files skipped because of size or extension (`selectFiles` filters them silently). Phase 1
§5.2 requires all of these. A reviewer cannot tell which four files were searched in the
`chalk/chalk` scan without downloading the JSON.

**F11. Preflight and discovery are still manual/partial.**
The target type is a user-selected dropdown (`index.html:30`), not an evidence-based
suggestion with confirmation. Only repository description and default branch are captured
(`src/github.js:68`); topics, license, language and archived/renamed status are absent, and
the description is not displayed. The priority document is a single optional path
(`index.html:35`); there is no document candidate list, no multi-select, and no monorepo
subdirectory scope. This is acknowledged in `docs/QA_REPORT.md` and
`docs/UX_WIREFRAME.md`, but it is the core of Phase 1 §5.1-5.2, so it is a milestone gap,
not a documentation gap.

**F12. Issue/PR provenance is weaker than the prompt requires.**
The adapter fetches issue/PR `state` and PR `merged_at` (`src/github.js:51-61`), but only
number/title/body/url/state reach the review; `mergedAt` is dropped when `issueSummary` and
evidence records are built (`src/main.js:104`, `src/review-core.js:69`). A closed PR is
therefore labelled only "closed", with no verified merged/unmerged distinction, and issue
citations have no retrieval timestamp, labels, or comment link. Phase 1 §5.3 asks for
verified merged status and cautious comparisons; the current UI neither claims a merge nor
helps the reviewer tell.

**F13. The test suite does not exercise the risky code paths.**
Twelve tests pass, but there are none for:

- `src/github.js` (URL/ref/tree/blob/issue/PR failure handling, request bounds, rate limits);
- `src/main.js` (DOM rendering, saved-review import, export, focus);
- negative statements ("does not support accessible names");
- oversized/extensionless/non-UTF-8 files, truncated trees, symlinks;
- prompt injection and XSS-shaped evidence text in the DOM;
- Markdown link sanitisation, saved-review shape validation, round-trip equality;
- multi-rule packs, evidence caps/deduplication, AI-prompt truncation.

There is also no CI test gate: `.github/workflows/pages.yml` deploys the site but never runs
`npm run check`. Add a test job before extending discovery.

**F14. Imported review data is not validated or bound to the current review.**
`loadSavedReview()` checks only version, question/array presence, repository URL, commit SHA,
warnings and questionnaire sources (`src/main.js:190-192`). It does not validate per-question
shape, evidence arrays, URLs, preset identity, or pack version. A structurally plausible file
with a question missing `evidence` reaches `renderQuestion()` and throws at
`q.evidence.length` (`src/main.js:148`); the error is caught and shown, but the review cannot
be opened. Treat saved reviews as untrusted: validate a strict schema, cap counts, and show a
clear rejection reason.

AI proposal import has a related provenance gap. `importAISuggestions()` (`src/main.js:175-185`)
validates only question and evidence IDs; the proposal itself carries no repository, commit, or
pack identity. `showReview()` does not clear `#ai-json` or `#ai-message` when a new repository is
analysed, so proposals written for one scan can survive into the next and be accepted if the
question/evidence IDs happen to collide (the packs use stable IDs, so `ACC-001-E1` is very
likely to exist again). Bind proposals to the review (`repository`, `commitSha`, pack ID and
version) or clear and re-key the import state on every scan; never let a suggestion from repo A
be applied to repo B without an explicit warning.

**F15. Human decisions lack timestamp, reviewer identity and explicit origin.**
`applyReviewerDecision()` stores only `answer`, `reviewerRationale` and
`reviewState:'human-reviewed'` (`src/review-core.js:127-130`). It does not store when, by
whom, or whether the decision was direct or accepted from an AI proposal (the AI path only
prefixes the rationale, `src/main.js:160-162`). Journey C and Phase 4 require a reviewer name,
date, source version and signed-off status, and `AGENTS.md` asks for decision origin. The
current export cannot answer "who approved this and when?".

**F16. GitHub API budget is unbounded from the UI perspective.**
A maximum scan makes 1 metadata + 1 commit + 1 tree + up to 20 blobs + 1 issues + 1 PRs =
**25 requests**. Unauthenticated GitHub allows 60 core requests/hour, so at most about two
maximum scans per hour. The code checks `x-ratelimit-remaining` only after a failure and
only when it is exactly `0` (`src/github.js:6-9`); secondary rate limits (`403` with remaining
> 0), `429`, and `Retry-After` are not distinguished. There is no preflight budget check, no
partial-result UI, no retry control, and no per-request timeout (only user cancellation).
Phase 1 §5.1 and the ROADMAP ask for better rate-limit handling and a visible coverage report.
There is also a concurrency hole: changing the pack during an in-flight scan re-enables the
Analyze button (`src/main.js:67-72`) without aborting the first request. A second submit
overwrites the global `controller` and both scans race to write `review` and the results, with
the older request using the pack configuration it read at its own point in the flow.

### Low and documentation drift

- **F17.** `fileBase()` names every export `...-horizontal-review`
  (`src/main.js:28`), even for the general pack; the old W3C name is still visible in
  filenames. Exports of the same repository/commit under two different packs also get the same
  filename, so a browser download can overwrite the first pack's review. The stale MIT
  `LICENSE` was replaced with AGPL-3.0-only after the audit; the export filename issue remains.
- **F18 (resolved post-audit).** `docs/ROADMAP.md` said "10 unit tests" (now 12);
  `docs/AI_AND_MCP.md` cited the WebMCP draft as 13 November 2026 (now 19 November 2026);
  `README.md` said to unzip into `repository-review-assistant/` (now the FASTER root).
- **F19.** `data/questionnaires/` and `data/rules/` are empty directories; they suggest a
  loader that does not exist.
- **F20.** `styles.css` is minified onto one line, which makes review and contrast fixes
  harder; `data/packs/w3c-horizontal-starter/questions.json` is similarly compact.
- **F21.** `safeRef()` accepts `.` and `./` (harmless 404); `parseGitHubUrl()` rejects
  `https://www.github.com/...`, a common paste; the HTML `pattern` is case-sensitive while
  the parser accepts uppercase hosts, so native validation and JS disagreement are possible.
- **F22.** `makeLink()` accepts any `https:` URL from a saved review
  (`src/main.js:19`), while Markdown export restricts links to `github.com`
  (`src/review-core.js:147-153`). The inconsistency is low risk because there is no HTML
  injection, but the UI should use the same allow-list.
- **F23.** There is no Content-Security-Policy meta tag. There are no third-party scripts and
  no HTML sinks, so this is defence-in-depth rather than a live vulnerability.
- **F24.** `toMarkdown()` truncates every text field to 1 000 characters and does not include
  pack version, license, reviewer identity, decision timestamps or evidence retrieval time.
  The first two are F5/F15; the truncation can silently shorten an AI explanation.
- **F25.** `safeMarkdownUrl()` hard-codes GitHub; it will silently drop links when a future
  GitLab/Codeberg adapter is added. Keep the adapter-specific allow-list, but make it explicit.

## 6. What is working and should be preserved

Confirmed by reading and live testing:

- Generic default pack, W3C pack optional, sustainability experimental; validator enforces
  five formal W3C areas and no sixth.
- Static, dependency-free vanilla JS site; no `innerHTML`, `eval`, `localStorage`, or
  automatic model calls (grep found none).
- Strict GitHub root URL and ref/path validation; no token field; public only.
- Bounded retrieval with a resolved commit SHA and `blob/<sha>/<path>#L<n>` links.
- Candidate-only evidence: `findEvidence()` never assigns an answer; new questions default
  to `needs-investigation`; human decisions and AI proposals are separate; AI import checks
  question and evidence IDs; applying a suggestion needs a click.
- Issue/PR state is surfaced and mutable-source warnings are present.
- JSON and Markdown export, saved-review import, SHA-pinned links, and limitations list.
- Read-only WebMCP tools with correct current-draft annotations, feature detection and
  no-AI fallback.
- No code execution, no GitHub writes, no remote MCP, no paid dependency.
- The documentation is unusually honest about what is not tested; `docs/QA_REPORT.md` does
  not claim browser or AT testing that did not happen.

## 7. Phase 1 readiness

Phase 1 §5.1-5.4 is **partially met**:

| Phase 1 requirement | Status |
| --- | --- |
| 5.1 repository preflight, default branch/SHA, description/topics/license/language | Partial: metadata, pinned SHA and an explicit type suggestion/confirmation are implemented; no monorepo subdirectory scope |
| 5.2 bounded source inventory, canonical docs, selected/skipped reasons, counts | Partial: ranked inventory, counts, reasons and multi-select are implemented; canonical/published-document detection is not |
| 5.3 history/issues: merged status verified, labels, timestamps, comment links, cautious README claims | Partial: labels/timestamps/merged state are carried; comment links, UI history views and README-claim comparison are not |
| 5.4 non-W3C pilot with exact SHA, ≥10 human-labelled passages for two areas, false positives/misses | **Preliminary**: Django pilot at `c67d872…` in `docs/PILOT.md` with 25 AI-assisted labels, 70% precision and 74% recall; independent human confirmation pending |

The `docs/PILOT.md` Django run is a preliminary pilot: its labels are AI-assisted and need
independent human confirmation before they count as Phase 1 acceptance evidence.

Recommended sequence before Phase 1 acceptance:

1. **Completed:** F1-F5, F6, F7 and F9 are fixed and covered by tests; `npm run check` is the
   PR/Pages gate.
2. **Completed:** discovery inventory, metadata, explicit type suggestion/confirmation and
   issue/PR label/timestamp/merged-state provenance.
3. **Preliminary pilot recorded:** `docs/PILOT.md` covers Django security/i18n at a pinned
   SHA with 25 AI-assisted labels, 70% precision and 74% recall. Next: independent human
   confirmation, re-measurement after the F8 change, and a second repository shape.
4. **Completed:** decision timestamp/origin (F15), saved-review/AI binding (F14), mocked
   adapter tests (F13), bounded retry behaviour (F16) and an offline evaluation harness.
5. Next: structured/semantic matching (F8), DOM integration tests (F13), an optional cache
   (F16), canonical/published-document detection and monorepo scoping.
6. Keep `README.md`, `docs/ROADMAP.md`, `docs/QA_REPORT.md` and this baseline current. Stop
   before Phase 2.

## 8. What was not tested / limits of this review

- No screen-reader test (VoiceOver, NVDA, JAWS) and no real keyboard-only session beyond the
  CDP focus check; no Firefox or Safari run; no touch/mobile device run.
- No WebMCP-capable browser was available. The tool contract was checked against the draft
  and the mock tests, not a real agent.
- Forced-colours was inspected only as a screenshot; axe was not run under forced colours.
  The 320 px check used device-metric emulation, not the browser's zoom UI (equivalent width,
  not a substitute for a real 400 % zoom session).
- No rate-limit exhaustion, private repository, deleted/renamed repository (only the is-odd
  404), non-UTF-8, truncated-tree, symlink, huge-file, or monorepo fixture was exercised.
- No AI provider was called; the AI path was tested only through the pure import validator
  and prompt-size probes. No human-labelled evidence-quality evaluation was performed.
- The repository has no git metadata, so this baseline is identified by content hashes rather
  than a commit. The live GitHub scans cite their own pinned SHAs.
- The two attached prompt documents are identical to the repository copies; this review does
  not independently verify every external standards status they cite. The five W3C horizontal
  groups were confirmed against the current W3C page; WCAG-EM/OpenACR/FAST/WSG status was not
  re-verified beyond the linked pages.

## 9. Notes on the handoff wording

`HANDOFF_PROMPT.md` says "Stop after completing the first tested milestone", while
`docs/IMPLEMENTATION_PROMPT.md` §14 says "The first requested implementation handoff is Phase 0
and Phase 1". Treat Phase 0 (this audit) and Phase 1 (discovery + pilot) as one handoff, and
stop before Phase 2. That is the only material ambiguity found in the two prompt files.
