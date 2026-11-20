# FASTER

**Framework for Accessible, Secure, Traceable, Evidence-based Review**

**Repository Review Assistant — version 0.2.0. Experimental, open-source, static-first.**

Enter **any public GitHub repository**, select a review pack, choose a few scoping options, and get a draft evidence-assisted cross-cutting review. The application samples repository documents, optional source code, recent issues and pull requests; maps keyword-based **candidate evidence** to starter questions; lets a human answer those questions; and exports Markdown or JSON. No AI provider, server, paid API or WebMCP browser support is required.

**The default review is general-purpose, not W3C-specific.** A separate, optional W3C-aligned *preparation* pack covers the five existing horizontal-review areas plus draft sustainability questions. Neither pack is an official questionnaire, conformance instrument, audit, or substitute for a standards organization's review process.

> **Pre-release status.** Phase 0 fixes for answer focus, contrast, 320 px reflow, extensionless documents and pack-version provenance are implemented. Remaining limitations and the evidence record are in [`docs/BASELINE.md`](docs/BASELINE.md). Do not present this build as an accessibility or conformance checker.

## Why "FASTER"?

FASTER is the project name; the acronym is a short description, not a standards claim:

| Letter | Word | What it means here |
| --- | --- | --- |
| F | Framework | A reusable engine and review-pack model, not a one-off checklist. |
| A | Accessible | Accessibility is a first-class review area and a requirement for the tool itself. |
| S | Secure | Untrusted source text is data, never instructions; no code execution. |
| T | Traceable | Source repository, commit, path, line, pack version and human decision stay linked. |
| E | Evidence-based | Deterministic evidence first; AI may propose, never decide. |
| R | Review | Human reviewers own the conclusions. |

## Start here

1. Clone this repository (or download and extract the archive) and change into its root directory.
2. Start a static web server:

   ```sh
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in a browser.
4. Enter a **public GitHub repository root**, for example `https://github.com/chalk/chalk`. Leave the ref blank to use its default branch. Extensionless `README`, `LICENSE`, `CHANGELOG` and common documentation formats are recognised; if no document can be found, discovery stops and asks for a document path.
5. Choose the **General cross-cutting review** pack (selected by default), target type and optional focus. Select review areas, then **Discover repository**. Review the committed inventory, confirm or apply the suggested project type, select up to 16 documents, then **Analyze selected documents**.
6. Examine candidate evidence and record human decisions. Export draft JSON or Markdown. Optional: download a bounded prompt for an AI of your choice, import suggestions as *unapproved*, and decide whether to accept them.

Run validation and unit tests (Node 20+):

```sh
npm run check
```

No `npm install` is needed. Do not open `index.html` with `file://`: modules and JSON use `fetch`.

## Included, implemented now

- General-purpose default pack: **20 original exploratory questions and 20 deterministic phrase-discovery rules** across accessibility, internationalization, privacy, security, architecture and sustainability.
- Optional W3C-aligned starter pack: **22 original exploratory questions and 22 rules**, with the five formal W3C horizontal-review areas clearly distinguished from experimental sustainability.
- Dynamic pack selector and scoping inputs (repository, default branch or specified ref, target type, goal, priority document, selected review areas, optional code sample).
- Pinned SHA for repository file citations; relative path and GitHub URL validation.
- Bounded retrieval: discovery returns a ranked inventory with selected/skipped counts, file sizes, reasons and tree-truncation warnings; analysis fetches **up to 16 selected documents, 4 code files, 20 issues, and 10 PRs**. GitHub requests may fail or be rate-limited; the UI reports the remaining API budget.
- Source provenance categories and keyword discovery. Candidate matches **never** mean a question is met, not met or inapplicable.
- Human decisions and rationales, unapproved AI suggestion import with verified evidence IDs, saved-review JSON import, Markdown and JSON export.
- Read-only, feature-detected draft browser WebMCP tools (`document.modelContext`), with functional normal-browser fallback.
- Project metadata and a transparent project-type suggestion (never auto-confirmed); the reviewer applies it explicitly.
- Issue/PR samples include labels, timestamps and verified merged status where available; mutable-source warnings remain.
- Data pack registry with explicit pack versions, validation scripts, **25 automated tests**, and a semantic no-framework UI with reduced-motion and forced-colors provisions. Answer changes keep focus, and a failed document discovery stops rather than fabricating a target. Remaining accessibility gaps are listed in [`docs/BASELINE.md`](docs/BASELINE.md).
- GitHub Pages deployment through GitHub Actions, gated by the `npm run check` CI job.

## Not implemented

- Complete and versioned official questionnaire ingestion, automated legal or semantic equivalence checks, or authoritative conformance assertions.
- Full-repository indexing, dynamic document discovery for every ecosystem, external URLs, generated ReSpec/Bikeshed outputs, issue comments, full PR diffs, linked tracking systems or comprehensive issue histories.
- High-quality semantic evidence extraction, code execution, real-world accessibility testing, energy testing, a built-in or local AI model, or direct AI provider calls.
- Automated answer approval, quantitative LLM confidence calibration, review-comparison across commits, server-side caching, GitHub authentication/private repository access, or write-back to GitHub.
- A conventional **remote** MCP server. GitHub Pages cannot host one; a Cloudflare Worker is the planned optional Phase 6 backend. Browser WebMCP is not a remote MCP endpoint and is not itself an AI model.
- Complete browser-based accessibility QA. Unit tests and headless axe checks pass for the Phase 0 blockers; live testing with diverse assistive technologies is still required. Remaining limitations are recorded in [`docs/BASELINE.md`](docs/BASELINE.md).

## Deployment

The canonical site is **GitHub Pages**, built and deployed by [`pages.yml`](.github/workflows/pages.yml). Pull requests run the same `npm run check` gate through [`check.yml`](.github/workflows/check.yml). See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for repository settings, verification steps, custom domains and the planned Cloudflare MCP service.

Cloudflare is **not** a backup for GitHub Pages. A conventional remote MCP endpoint is a separate service with its own authentication, cache, rate limits, privacy review and cost; it is deferred until the browser workflow and Phase 1 pilot are validated.

## Recommended project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Accessible static web user interface |
| `src/main.js` | Application state, scoping, human decisions and exports |
| `src/github.js` | GitHub API adapter with bounded, version-pinned retrieval |
| `src/review-core.js` | Pure parsing, candidate evidence rules, review model and AI proposal validation |
| `src/webmcp.js` | Feature-detected read-only browser WebMCP tools |
| `data/presets.json` | Registry of interchangeable review packs |
| `data/packs/general/` | Default original exploratory prompts and rules |
| `data/packs/w3c-horizontal-starter/` | Optional W3C-aligned *starter*, not official source text |
| `tests/`, `scripts/` | Unit tests and data-pack validation |
| `.github/workflows/` | CI check and GitHub Pages deployment |
| `docs/IMPLEMENTATION_PROMPT.md` | **Full consolidated handoff prompt**, phased implementation and acceptance criteria |
| `docs/BASELINE.md` | Phase 0 audit, known limitations and remediation priority |
| `docs/PILOT.md` | Preliminary Django security/i18n pilot and labelled evidence |
| `docs/DEPLOYMENT.md` | GitHub Pages, AGPL source offer and future Cloudflare MCP plan |
| `docs/` | Architecture, UX, data schemas, governance, security, WebMCP, AI and roadmap |
| `AGENTS.md` | Instructions for coding agents |
| `START_HERE.md` | Project orientation and build sequence |

## Operating principles

1. **Repo first, framework second.** The app must be useful for ordinary GitHub projects with no W3C connection.
2. **Rules for evidence discovery, humans for outcomes.** Keep `unreviewed`, `AI proposed`, `human confirmed`, `disputed`, `needs investigation` distinct.
3. **Always cite origin and version.** GitHub blobs are pinned to a SHA; issues/PRs remain mutable and are explicitly lower-authority evidence.
4. **No invented compliance or sustainability scores.** A missing keyword is not a failed requirement; a keyword match is not confirmation.
5. **Bring your own AI, optionally.** The normal website works without it, including Firefox without WebMCP support.
6. **Open governance and extensibility.** W3C, WSG, WCAG-EM and OpenACR are possible integrations, **not the core model**. Avoid inventing new standards.
7. **Review privacy and consent.** Nothing is sent to an AI service automatically. Public GitHub source is retrieved directly by the browser. Do not run arbitrary repository code.
8. **Keep the source offer visible.** If you deploy a modified version, publish the Corresponding Source and keep the source link in the UI, as AGPL-3.0 requires.

## What to build next

The most valuable next step is the **first non-W3C labelled pilot** against the new inventory, followed by structured evidence extraction (word-boundary/normative parsing), canonical/published-document detection and review continuity. See `START_HERE.md` and `docs/IMPLEMENTATION_PROMPT.md` for the sequential roadmap. The remaining baseline findings (F8, F13-F16) are tracked in [`docs/BASELINE.md`](docs/BASELINE.md).

## License, source and authority

FASTER's original code and original questions are licensed under the **GNU Affero General Public License, version 3 only** (`AGPL-3.0-only`). See [`LICENSE`](LICENSE) and <https://www.gnu.org/licenses/agpl-3.0.html>.

Because FASTER is served over a network, AGPL section 13 applies: users interacting with a modified deployed version must be offered its Corresponding Source. This repository and the **Source** link in the site footer satisfy that offer for the canonical deployment. Keep them available in any fork, mirror or future Cloudflare endpoint.

Linked third-party standards and questionnaires retain their respective licenses and are not redistributed here. Source URLs appear in pack metadata. Official W3C question text is not included. Refer to [W3C horizontal groups](https://www.w3.org/guide/process/horizontal-groups), [W3C document reviews](https://www.w3.org/guide/documentreview/), the [WebMCP draft](https://webmachinelearning.github.io/webmcp/), and [WSG Group Note Draft](https://www.w3.org/TR/web-sustainability-guidelines/) for current source status.
