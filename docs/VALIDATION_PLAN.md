# Validation and pilot plan

## Baseline checks

Run `npm run check`. Data validation and Node's built-in unit tests should both pass. The starter also requires browser/assistive technology QA; passing Node tests is not enough.

## Phase 1: Generic repositories first

Select at least three diverse non-W3C public repos, preferably a small application, a documented library, and a service/API. Record their exact SHAs, public document paths, source counts and GitHub API response time. Do not cherry-pick only repositories with explicit 'accessibility' or 'privacy' keywords. If testing a repository whose source may be sensitive, obtain permission first.

Compare extracted evidence to a human-created answer key. Measure:

- **Citation precision:** fraction of proposed evidence snippets that actually support the stated search context.
- **Recall of known relevant passages:** fraction of hand-labeled known source passages found by extraction.
- **Evidence authority classification:** whether sources are correctly labeled as documentation, code, open issue or PR, and normative where appropriate.
- **Unsupported interpretations:** number of accepted answers relying on missing/irrelevant/circular evidence.
- **Time saved:** median human preparation and completion time vs. baseline manual review, using the same review scope.
- **Question completion with accountability:** fraction of outcomes having a human rationale and linked evidence; not a simple answer rate.

Do not publish arbitrary confidence percentages or conformance scores.

## Adversarial fixtures

Add synthetic local fixtures for:

1. An obvious keyword in a statement denying support (`"Keyboard input is NOT supported"`).
2. An unresolved issue saying a capability is missing, alongside an informative guide claiming it exists.
3. A closed but **unmerged** PR proposing a fix.
4. A nested repository or monorepo with multiple target documents and misleading README content.
5. A prompt-injection string in an issue description.
6. Source file above size threshold, truncated tree, non-UTF-8 content, missing ref, rate limit, revoked repo and long malformed issue text.
7. Conflicting claims across two versions or branches; stale/renamed source links.
8. A repo with no actual specification or no relevant documentation.

Tests must assert **no automatic Met/Not met conclusion** in every case.

## Web UI QA

Test Firefox, Chromium and Safari without WebMCP, and WebMCP-capable Chromium when available. Test keyboard navigation, screen readers, zoom 400%, text-only, forced colors, reduced motion, high-contrast OS themes, low bandwidth and no clipboard permissions. Confirm progress/error messages and source links are comprehensible without color. Report actual environment and date, not generic 'accessibility tested' claims.

## Later W3C pilot

Only after generic pilots, test `w3c/fast` and `w3c/sustainableweb-wsg` as examples of specification documents. Compare evidence to public horizontal-review discussions; do not claim the generated outputs replace the review groups. For sustainability, use a clearly versioned experimental questionnaire and flag the absence of official horizontal group status.

## Stop conditions

- No source provenance, or unknown document revision: do not issue a conclusion.
- Unsupported AI citation: reject proposal.
- API coverage incomplete: display warning and leave affected questions unresolved.
- Untrusted content tries to instruct the tool: ignore as instructions, retain as source data only.
- W3C source license/status uncertain: link to it; do not copy its full content.
- Browser WebMCP absent: continue with ordinary website.
- Remote MCP auth incomplete: do not deploy.
