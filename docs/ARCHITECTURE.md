# Architecture: static-first, review-pack-neutral

## Implemented v0.2

```text
Public GitHub URL + a few scoping questions
            |
            v
GitHub repository adapter (read-only, bounded)
  - metadata and default branch -> resolved SHA
  - selected Markdown/HTML/Bikeshed files
  - optional code, issues and PR summaries
            |
            v
Pure evidence discovery engine
  - original JSON question packs
  - deterministic keyword matches, source links
  - candidate-only results, no automatic decisions
            |
            v
Human review interface
  - status, evidence, rationale, notes
  - optional AI prompt export / proposal import
  - feature-detected read-only WebMCP tools
            |
            v
Draft JSON / Markdown export, manual publication
```

The **review engine** and **review pack** are separate. The same repository snapshot can be evaluated against several versioned packs without making the core depend on W3C. Current UI performs one pack per scan. Multi-pack review composition is a future extension.

## Packages and intended boundaries

| Boundary | Responsibility | Current implementation |
| --- | --- | --- |
| Repository adapters | GitHub first, later GitLab, Codeberg, ZIP and URL | `src/github.js` |
| Parser/extractor | Documents, normative clauses, source excerpts, issue states | Thin deterministic line extraction in `src/review-core.js` |
| Pack registry | Source authority, question wording, applicability, evidence hints | `data/presets.json`, `data/packs/*` |
| Review engine | Evidence graph, versioning, decisions, export | `src/review-core.js` |
| UI | Scope intake, evidence inspection, questions, approval | `index.html`, `src/main.js`, `styles.css` |
| AI adapter | Optional proposal generation by user's AI | Manual prompt/export now; pluggable adapters later |
| Browser WebMCP | Tool access for compatible in-browser agent | `src/webmcp.js` read-only |
| Remote MCP | Standard MCP endpoint with auth, rate limits | **Not built**; would require backend |

## Important technical choices

- Preserve **deterministic extraction** for provenance. An LLM may propose interpretations, but a human decision and an observed excerpt are distinct artifacts.
- Preserve immutable URL for repository file contents at a resolved commit SHA. Issue/PR pages are not immutable, so include retrieval date and state for future improvements.
- Keep layers provider-neutral: `analyzeRepository` should not know anything about WebMCP, a model vendor, or W3C. `evaluateReviewPack` should not fetch external URLs directly.
- Return warnings for truncated trees, skipped files, rate limits, partial issue histories and unsupported formats. Do not interpret a missing match as a negative result.
- Long-term: stable source inventory, candidate evidence store, deduplicated clauses, questionnaire version diffs, review changes over commits, persistent progress and undoable decisions.

## Why no automatic code execution?

Source files are evidence. Running unknown CI workflows, scripts, builds or test commands would introduce code-execution and data-exfiltration risks. Any future dynamic analysis must run in an explicitly sandboxed, permissioned environment and be completely independent from initial repository intake.

## Hosting

The current bundle is deployed to GitHub Pages through GitHub Actions (`docs/DEPLOYMENT.md`). GitHub API rate limits, CORS, browser resources, privacy and large repository handling constrain its scale. A future Cloudflare Worker could cache immutable snapshots and provide bounded server-side retrieval for an optional remote MCP endpoint, but a backend should be introduced only after the browser workflow is validated.
