# Learnings: v0.2 starter to v0.3.0

Date: 2026-11-20
Scope: the Phase 0 audit, Phase 1 discovery, evidence/provenance hardening, the offline
evaluation harness and the expanded browser WebMCP surface.

## What shipped

| PR | Outcome |
| --- | --- |
| #1 | Fixed Phase 0 blockers: focus retention, contrast, 320 px reflow, extensionless documents, no-document gate and pack version. |
| #2 | Added the two-step discovery flow: metadata, ranked inventory, multi-select, type suggestion, issue/PR history metadata. |
| #3 | Added word-boundary matching, saved-review validation, AI-proposal binding, reviewer/decision provenance and bounded GitHub retries. |
| #4 | Added the offline evaluation harness, bounded tree/blob cache, monorepo scope and evidence history metadata. |
| #5 | Added section context, normative/negation/contradiction hints, snippet deduplication and the repository homepage. |
| #6 | Added candidate canonical/documentation link extraction. |
| #7 | Expanded browser WebMCP to eight read-only tools, added output schemas, activity events and a discoverable tool panel. |

## What worked

1. **Static-first was the right constraint.** GitHub Pages, plain HTML/CSS/ES modules and no
   runtime dependencies kept the deploy simple and the review reproducible. The only backend
   need identified was an optional remote MCP/cache service, not the core workflow.
2. **Separating discovery from analysis.** Fetching metadata/tree first, then showing an
   inventory, made coverage visible and made the no-document case honest. It also exposed the
   extensionless-README failure that the one-shot scan hid.
3. **Candidate evidence, not conclusions.** Keeping `needs-investigation` as the default and
   labelling keyword hits as candidates survived every feature addition and AI proposal import.
4. **Browser-level verification caught what unit tests could not.** Axe found systemic contrast
   failures; CDP found focus loss, the file-input overflow and the need to focus the results
   heading. The 320 px check caught a second overflow in the snapshot label and status text.
5. **An offline evaluation harness.** A saved review plus labelled passages produced useful
   precision/recall without a model call, API key, Cloudflare or paid dependency. This is the
   right default for a privacy-conscious review tool.
6. **Real WebMCP flag testing.** Chrome 157 with `--enable-features=WebMCP` registered all eight
   tools, validated their output schemas and fired `toolactivated`. Launching without the flag
   verified the visible fallback.
7. **Small PRs with CI.** The check workflow and Pages dependency kept each merge deployable;
   leaving PRs open matched the reviewer's workflow better than merging immediately.

## What surprised us / went wrong

- **The documented quick-start repo produced zero documents.** `octocat/Hello-World` has an
  extensionless `README`; the extension filter silently skipped it. The demo was not exercising
  the product.
- **Accessibility regressions were in the shared design tokens and DOM lifecycle**, not in the
  review logic: `GrayText` contrast, full-list re-rendering on every answer, and unconstrained
  file inputs. Axe/CDP were necessary.
- **Substring matching was worse than expected.** `api` matched “capital” and “rapid”; PR
  templates produced repeated “does not disclose a security vulnerability” hits. Word boundaries
  and dedupe helped; semantic ambiguity did not disappear.
- **Project-type heuristics needed real fixtures.** Incidental `.csv` files and nested
  `servers/` directories misclassified Django before the heuristics were corrected. A suggestion
  must stay a suggestion.
- **GitHub Pages artifact reruns failed.** Rerunning a job that already uploaded
  `github-pages` produced “multiple artifacts”; a fresh workflow run and current action majors
  fixed it. Pages also needed to be enabled before the first deploy.
- **Merged PRs disappear from the default `/pulls` view.** The first review PR looked missing
  because `/pulls` shows open PRs; merged PRs are under Closed. Leaving the next PR open made it
  visible.
- **Documentation counts drift.** Test counts, HTML ID counts and “not verified” statements
  went stale several times. Counts now come from commands where practical, but this needs
  ongoing discipline.
- **License changes have operational consequences.** Moving to AGPL-3.0-only required updating
  every doc, the footer source offer, the package metadata and the deployment notes. Any future
  Cloudflare Worker also needs a Corresponding Source offer.
- **AI-assisted labels are not human labels.** The Django pilot is useful, but its metrics are
  an internal check, not independent validation.

## Decisions

- **Project identity:** FASTER, with the Repository Review Assistant as the product; the acronym
  is descriptive, not a standards claim.
- **License:** AGPL-3.0-only for original code/questions, with a visible source offer.
- **Hosting:** GitHub Pages is canonical; Cloudflare is deferred. It is not a backup for Pages
  and is not needed for the static site, cache or offline evaluation.
- **AI:** optional, provider-neutral and human-approved. No model call happens automatically.
- **MCP:** browser WebMCP is read-only; a conventional remote MCP server is Phase 6 and separate.
- **Evidence:** deterministic candidates first; AI proposals carry a review binding and never
  change a human answer.

## Open risks

- **Human pilot labels are pending.** The 25 Django labels are AI-assisted; recall/precision
  should be re-measured after confirmation and after the F8/context changes.
- **Semantic matching is still shallow.** Word boundaries, sections and hints help, but generic
  words and paraphrases remain false-positive/miss risks.
- **No DOM integration suite in CI.** Chrome/CDP checks are manual; browser regressions can slip
  past the 43 Node tests.
- **Canonical/published status is unverified.** Extracted links are candidates; the content is
  not fetched and the canonical status is not asserted.
- **Persistent/server cache is absent.** The in-memory SHA cache reduces repeat work within a
  session but does not solve cold-start rate limits.
- **WebMCP needs a real agent test.** We tested the browser API directly, not ChatGPT Desktop,
  Edge, Brave or another agent with user permission.
- **W3C status and licenses change.** FAST, WSG, privacy/security and i18n resources must be
  re-checked before any official integration.

## Process improvements

- Keep a browser/axe/CDP check in the loop for every UI change, especially focus and reflow.
- Check extensionless documents and the no-document path before calling discovery “working”.
- Treat project-type suggestion as an untested hypothesis until a real repository confirms it.
- Run the evaluation fixture after evidence-matching changes and record whether labels were
  human-confirmed.
- Keep PRs open for review; merged PRs belong under Closed.
- Delete merged branches promptly and prune remote-tracking refs.
- Generate or verify doc counts; do not hand-edit “N tests” without checking.
- Use a fresh Pages workflow run rather than rerunning one with an existing artifact.
- Tag releases after CI and a documented release note.

## Next priorities

1. Obtain independent human confirmation of the 25 pilot labels; re-run `npm run evaluate`.
2. Add a browser/axe CI fixture (or a documented manual gate) for focus, reflow and WebMCP.
3. Improve semantic matching and contradiction handling without inventing confidence scores.
4. Add comment-level provenance and cautious README-claim comparison.
5. Add persistent or server-side caching only when rate limits justify the operational cost.
6. Design a remote MCP endpoint on Cloudflare only after the browser workflow and pilot are
   validated; include auth, quotas, cost, privacy and AGPL source-offer requirements.
