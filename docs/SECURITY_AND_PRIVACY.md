# Security, privacy and threat model

## Trust boundaries

Untrusted inputs: repository root URL, branch/ref, document path, GitHub issues/PRs, repository files, questionnaire packs from third parties, saved-review JSON, AI-generated proposals and model-tool invocations.

Trusted code: locally served frontend and static data packs reviewed within this repository. Even pack authorship does not make question content authoritative.

## Starter controls already present

- Only `https://github.com/owner/repo` root URLs accepted, with no credentials, query strings or arbitrary domains. GitHub REST API host is hard-coded.
- Ref validation and optional relative-document-path validation prevent typical traversal and malformed URLs.
- Bounded file count and file size, issue/PR sample size and AI prompt size.
- Repository text placed into DOM via `textContent`, not `innerHTML`.
- Exports require direct user actions. No automatic GitHub writes or AI API calls.
- AI-import proposals require known question and evidence IDs and never overwrite human decisions automatically.
- Browser WebMCP operations are read-only and feature-detected.

## Gaps and recommended protections

- Rate limiting and caching: unauthenticated GitHub API requests are constrained. Add fair-use limits and cache by immutable commit before scaling.
- Content safety: cap total decoded bytes and per-file lines, normalize control characters, and avoid untrusted URLs except verified source hosts. Consider checks against malicious Markdown links in exports.
- AI prompt injection: keep evidence within clearly marked untrusted sections, permit only bounded JSON outputs, and require human approval for conclusions or external actions.
- Saved review JSON: schema validation currently checks core fields but is not a complete validator. Add strict shape, size, URL and version validation.
- Code execution: do not build/run repositories by default. Future dynamic testing needs a sandbox with no privileged credentials, restricted network and resource budgets.
- Privacy: GitHub retrieval occurs from the visitor's browser. The browser may send network metadata to GitHub. Do not add trackers or telemetry without explicit design and notice.
- Third-party AI: manual transfer can disclose public or sensitive text. Add plain-language disclosure before future remote providers; do not send private data silently.
- Remote MCP: use authentication, scoped authorization, OAuth where appropriate, cross-origin and SSRF defenses, quotas, secret rotation and clear audit logs.
- Supply chain: avoid adding JS libraries and build dependencies without reviewing maintenance, governance and licensing.

## No assertion of security assurance

These are early starter protections, **not** a penetration test or security certification. Track decisions and remediation in a normal issue process.
