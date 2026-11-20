# Deployment: GitHub Pages now, Cloudflare MCP later

Status: **GitHub Pages is the canonical deployment.** Cloudflare is *not* a backup for the
static site and is not required for Phase 0 or Phase 1.

## 1. Repository settings

- Public repository: `https://github.com/mgifford/FASTER`
- Default branch: `main`
- License: `AGPL-3.0-only` (see `LICENSE` and `NOTICE`)
- Pages source: **GitHub Actions**, not "Deploy from a branch"
- Site URL: `https://mgifford.github.io/FASTER/`
- Actions must be enabled. The deploy environment is `github-pages`.

Add a branch ruleset that requires the **Check** workflow on pull requests to `main`, and
blocks force pushes. The deploy workflow runs the same check before publishing, so a broken
data pack or unit test cannot reach the live site.

## 2. Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/check.yml` | pull request, manual | `npm run check` on Node 22 |
| `.github/workflows/pages.yml` | push to `main`, manual | `npm run check`, then upload and deploy to Pages |

No `npm install` is needed and there are no runtime dependencies. Do not add a build step
unless a demonstrated accessibility or maintainability benefit justifies it; the site is
plain HTML, CSS and ES modules.

## 3. First deployment checklist

1. Push the baseline to `main`.
2. GitHub → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Wait for the **Deploy GitHub Pages** workflow to finish.
4. Verify the project URL, including the capitalised `FASTER` path:
   - `https://mgifford.github.io/FASTER/` returns the page;
   - `https://mgifford.github.io/FASTER/data/presets.json` returns JSON;
   - `https://mgifford.github.io/FASTER/src/main.js` is served as JavaScript;
   - the browser console has no CORS or module errors;
   - a scan of a public repository produces pinned
     `https://github.com/<owner>/<repo>/blob/<sha>/<path>#L<n>` links.
5. Run a keyboard pass and an axe scan against the deployed URL. The local Phase 0 findings
   are not fixed yet; do not describe the site as accessible until they are.

Relative `fetch('data/...')` paths resolve under the `/FASTER/` project path, so no base-path
build setting is required. If the repository is renamed, add or update a redirect plan and
re-verify the Pages URL.

## 4. Custom domain and Cloudflare DNS

Optional. If a custom domain is added:

1. Add the domain in Settings → Pages and follow GitHub's DNS instructions.
2. If DNS is managed by Cloudflare, use a **DNS-only** CNAME to `mgifford.github.io` until
   GitHub has issued the certificate. A proxied record during certificate issuance can cause
   validation loops or redirect problems.
3. After HTTPS is working, decide deliberately whether to enable the Cloudflare proxy; test
   redirects, caching and certificate renewal. Keep GitHub Pages canonical.

## 5. AGPL source offer

FASTER is licensed under AGPL-3.0-only. Users interacting with the deployed site over the
network must be offered its Corresponding Source (AGPL section 13). The canonical deployment
satisfies this through:

- the public repository at `https://github.com/mgifford/FASTER`;
- the **Source (AGPL-3.0)** link in the site footer;
- `NOTICE`, which states the license and the source URL.

Any fork, static mirror or future Cloudflare endpoint that runs modified code must keep an
equivalent source offer visible. Do not remove the footer link when rebranding.

## 6. AI evaluations do not require Cloudflare

The offline evaluation harness in `docs/EVALUATION.md` compares a saved review with labelled
passages and validates AI proposals without calling a model. Use the reviewer's own provider or
a manual workflow; do not add a hosted model dependency merely to run evaluations. A Worker
could later host an optional evaluation proxy or remote MCP endpoint, with consent, auth,
budget and source-offer requirements, but that is not needed for the current pilot.

## 7. Cloudflare: what it can and cannot do

GitHub Pages serves static files only. It cannot expose a persistent MCP endpoint, run
OAuth, hold a GitHub token, cache GitHub API responses, or enforce per-user quotas.

A **Cloudflare Worker** can host a conventional remote MCP endpoint later. That is a separate
service, not a fallback for browser WebMCP and not a backup for the Pages site. The browser
already has a no-AI/no-MCP fallback: the ordinary accessible interface.

### Deferred Phase 6 design constraints

If a remote MCP endpoint is added, it must:

- expose read-only tools only, matching the browser tool surface
  (`list_review_packs`, `get_review_overview`, `list_unresolved_questions`,
  `get_question_evidence`, and later an inventory/evidence tool);
- authenticate clients and authorize access; do not expose an open proxy;
- cache immutable GitHub snapshots by commit SHA (KV or D1) and never mirror mutable issue
  pages without a retrieval timestamp;
- hold the GitHub token server-side as a Worker secret; never send it to the browser;
- enforce per-client quotas, request-size and response-size caps, timeouts and rate limits;
- restrict CORS to the Pages origin and refuse arbitrary URL fetches (SSRF defense);
- mark repository text as untrusted, preserve citations, and never auto-approve findings;
- record model/provider metadata only when an AI adapter exists;
- add a privacy notice covering GitHub requests, logs, retention and any third-party AI use;
- document cost, quotas and failure behavior, and keep a static-only path working;
- keep the AGPL Corresponding Source offer for the Worker itself.

A Cloudflare **Pages** mirror of the same repository is also possible (no build command,
output directory `/`). It can provide per-PR preview URLs and a second static host, but it does
not add MCP. If used, keep GitHub Pages canonical and update the source-offer link; do not let
the two deployments drift.

## 8. Rollback

- Revert the offending commit on `main`; the Pages workflow redeploys the previous content.
- If a deploy fails, inspect the **Deploy GitHub Pages** run; the `check` job must pass before
  `deploy` starts.
- A Cloudflare Worker, when introduced, should be versioned and deployed separately with its
  own rollback; it must never be required for the Pages site to load.
