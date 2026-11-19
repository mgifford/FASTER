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

The starter exposes **read-only** tools when the browser supports `document.modelContext.registerTool`:

- `list_review_packs`
- `get_review_overview`
- `list_unresolved_questions`
- `get_question_evidence`

No WebMCP? The ordinary accessible UI remains usable. The implementation deliberately avoids model-triggered writes or opaque finalization. Update API signatures against the current draft before claiming browser compatibility. Browser support may require experimental flags or be unavailable.

## Suggested future WebMCP tools

- `get_repository_inventory`: source paths and discovered publication metadata, no repository contents by default.
- `get_relevant_evidence(questionId, maxResults)`: bounded snippets with provenance and truncation notices.
- `suggest_next_question`: deterministic priority list, with explanation and no auto-answer.
- `prepare_review_export`: preview data, no publication side effect.
- `propose_follow_up`: return suggested human question text, not alter review state.

Use read-only annotations; keep outputs small; mark repository content as untrusted. Require direct user gestures for any mutation, disclosure or export with privacy implications.

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
