# Start Here: consolidated handoff

This project is a working **generic GitHub repository review assistant**, not a W3C application with generic names. The default questionnaire is organization-neutral, and a W3C-aligned draft pack is optional. The guiding principle is **extract reproducible evidence, show its limits, then ask a human only what still needs judgment**.

## For a reviewer

Run `python3 -m http.server 8000` and visit `http://localhost:8000`. Enter a public repository, leave the ref blank unless a version matters, choose a review pack and areas, and analyze. The app builds an editable draft; do not treat it as an accessibility, security, sustainability or standards conformance finding. Save JSON to resume; export Markdown for discussion. Copy/download the AI prompt only if you choose to share evidence with your AI provider.

## For an AI coding agent

1. Read `AGENTS.md`, this file, `README.md`, and **all of** `docs/IMPLEMENTATION_PROMPT.md`.
2. Inspect source and data directories. Run `npm run check` before changing anything.
3. Work on **Phase 0, then Phase 1** in the master prompt. Do not skip verification or rewrite the project using a heavy framework without an explicit reason.
4. Do not switch the first example to a W3C repository. Choose an ordinary, appropriately maintained open-source GitHub project as the first pilot; a W3C specification is a later integration pilot.
5. Report files changed, features added, test evidence, limitations and next steps. Stop after the first complete tested milestone unless explicitly asked to proceed.

## Scope guardrails

- Work with public repositories only until authentication, privacy, rate-limit handling and data retention have been designed.
- Do not auto-run code from a repository being reviewed.
- Do not auto-publish GitHub issues, reviews, self-assessments or conformance claims.
- W3C formal horizontal reviews remain owned by the reviewing groups. The sustainability questionnaire is experimental and not a sixth official horizontal-review discipline.
- Do not conflate WCAG-EM (evaluation methodology), OpenACR (reporting format), FAST (specification checklist) and a general-purpose repository evidence assistant.
- Browser WebMCP is optional and experimental; it is not a model and not a remote MCP endpoint.

## Where everything lives

| Question | Read |
| --- | --- |
| What can the starter actually do? | `README.md` |
| What should the finished product look like? | `docs/UX_WIREFRAME.md` |
| How should the code be structured? | `docs/ARCHITECTURE.md` |
| How should review packs and evidence records work? | `docs/DATA_MODEL.md` |
| Which frameworks can it support, and with what authority? | `docs/GOVERNANCE.md` |
| How does my own AI interact with it? | `docs/AI_AND_MCP.md` |
| What are the security and privacy requirements? | `docs/SECURITY_AND_PRIVACY.md` |
| How do we know it works? | `docs/VALIDATION_PLAN.md` and `docs/QA_REPORT.md` |
| What's the complete implementation plan? | **`docs/IMPLEMENTATION_PROMPT.md`** |
| How is it deployed, and what does AGPL require? | `docs/DEPLOYMENT.md` |
| What is known broken or untested? | `docs/BASELINE.md` |
