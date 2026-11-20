# Bring your own AI, browser WebMCP and future remote MCP

## The user's own AI is optional

The browser app collects candidate evidence and saves review decisions without calling any model. It can:

1. Download a bounded evidence prompt with source references.
2. Let the reviewer provide it manually to **their own** AI service or local model.
3. Import the AI's JSON suggestions while strictly validating question IDs and cited evidence IDs.
4. Require a **human click** to apply each suggestion as a human decision.

No information is automatically uploaded to any AI vendor. A browser with no AI, Firefox without WebMCP, and a fully offline AI workflow can still use the exported JSON/Markdown (after GitHub evidence was retrieved).

## WebMCP is not a model

The [WebMCP draft](https://webmachinelearning.github.io/webmcp/) is a W3C Community Group Report (19 November 2026), not a W3C Recommendation. It defines browser JavaScript tool exposure through `document.modelContext`. It is neither a conventional MCP endpoint nor a built-in LLM.

The starter exposes **eight read-only tools** when the browser supports
`document.modelContext.registerTool`:

| Tool | Output |
| --- | --- |
| `list_review_packs` | Pack ID, title, description, version, status, kind and default areas. |
| `get_review_overview` | Repository, pinned commit, pack, retrieval time, coverage/inventory, evidence and question counts. |
| `get_question_evidence` | One question and up to six bounded excerpts with section, labels, negation, possible-normative and conflict hints. |
| `list_unresolved_questions` | Up to 40 unresolved questions with evidence counts and hints. |
| `get_repository_inventory` | Metadata, selected/skipped counts, inspected files and candidate published links; no file contents. |
| `get_questionnaire_provenance` | Pack version/status, areas and authoritative source links. |
| `get_counterevidence` | Up to 20 evidence candidates flagged as possible negation or conflicting; candidates only, not conclusions. |
| `prepare_export_preview` | Bounded draft summary and unresolved IDs; no export, download or publication. |

Each tool declares an `outputSchema`, read-only annotations and bounded inputs/results. Source
content tools set `untrustedContentHint`; no tool sets a consequential/write annotation. The page
listens for `toolactivated` and `toolchange` and shows a polite activity message.

Browser support (20 November 2026): Chrome 149 and Edge 150 expose WebMCP through origin
trials; local Chrome testing uses `about:flags#enable-webmcp-testing` or
`--enable-features=WebMCP`. Brave 1.102.2, ChatGPT Desktop and Meta Ray-Ban Display are listed
in the project's implementation-status document; Firefox and Safari do not currently expose
the API. The ordinary UI remains the only required path. See the
[WebMCP implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md).

No WebMCP? The ordinary accessible UI remains usable. The implementation deliberately avoids
model-triggered writes or opaque finalization. Update API signatures against the current draft
before claiming browser compatibility. Browser support may require experimental flags or be
unavailable.

## Discoverability

The **Browser agent tools (WebMCP)** panel is visible near the top of the page. It shows:

- whether WebMCP is available in this browser;
- all eight tools, even when unavailable;
- browser-enablement instructions;
- a copyable example agent prompt;
- a live activity line when an agent activates a tool.

The footer also links to the panel and summarises availability. This is ordinary HTML/CSS/JS;
no browser agent is required to review evidence.

## Suggested future WebMCP tools

- `get_changes_since_review`: compare two saved reviews by repository, commit and pack version
  (requires the continuity work).
- `get_related_discussions`: bounded issue/PR links for one question, with retrieval timestamps.
- `prepare_review_export`: a preview of the exact export payload, still with no download side
  effect.

Use read-only annotations; keep outputs small; mark repository content as untrusted. Require
direct user gestures for any mutation, disclosure or export with privacy implications.

## AI adapter interface for a later phase

```js
// Proposed interface, not currently implemented in the starter.
async function proposeAnswers({review, questionIds, provider, signal}) {
  return [{
    questionId: 'ACC-001',
    suggestedAnswer: 'needs-investigation',
    explanation: 'The evidence shows a discussion, not a resolved implementation.',
    evidenceIds: []
  }];
}
```

Implement adapters in stages: manual prompt import (done), browser-provided AI (capability detected), self-hosted or local model (user selects provider and approves any model download), optionally remote AI (explicit destination/consent). Local browser inference is not guaranteed to work on every device and can have meaningful memory/energy costs. No model's claimed certainty percentage should be treated as measured evidence quality.

Record method, model identifier if supplied, prompt version, timestamp, cited evidence IDs and *unapproved status*. Reject fabricated citations, hidden source URLs, unsupported metrics and anything that tries to publish externally.

## Future conventional MCP service

A real remote MCP server would be a separate service with authenticating clients, rate-limited GitHub ingestion, immutable cache by SHA, size bounds, scoped OAuth for authorized writes, security review, logs and resource caps. GitHub Pages alone cannot host it. A lightweight Cloudflare Worker is one possible backend, but should not become a requirement for static development; see `docs/DEPLOYMENT.md`.

Candidate server tools: `inspect_repository`, `list_review_packs`, `get_question`, `retrieve_evidence`, `compare_reviews`, and `prepare_export`. No actual remote MCP endpoint or write tool exists in this ZIP.

## Critical safeguards

- A GitHub issue or source comment can contain prompt-injection instructions. Treat all imported text as **data**. It must not override the review workflow.
- An AI suggestion can conflict with a normative statement or cite only an unmerged PR. Surface the conflict, do not infer a resolution.
- Any AI provider might receive snippets that the reviewer did not intend to disclose. The site must explain data sharing before transmission; no automatic submissions.
- Official decisions, conformity status, issue publication and GitHub write operations require explicit human review and authority.
