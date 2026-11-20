# Evidence and AI-proposal evaluation

This is a **model-neutral, offline** evaluation harness. It makes no network call, no model call
and no Cloudflare request. You bring a saved review and a labelled passage file; the script
compares them and checks optional AI proposals.

## Why no Cloudflare or model API is needed

The project deliberately keeps AI optional and provider-neutral. The evaluation compares
evidence candidates that the deterministic engine already produced with human-readable labels,
and validates AI proposals that were copied in through the normal import path. A remote model
or Worker would add cost, privacy exposure and another dependency without improving this
measurement. If a hosted model runner or remote MCP endpoint is added later, it should be a
separate, optional service with explicit consent, authentication, budgets and a source offer.

## Run the recorded pilot

```sh
npm run evaluate
```

This uses `evaluations/pilot-django-review.json` and
`evaluations/pilot-django-2026-11-20.json`. The current result is 70.0% precision and 73.7%
recall against **AI-assisted** labels; human confirmation is pending.

To evaluate your own review:

```sh
npm run evaluate -- --review path/to/review.json --labels path/to/labels.json
npm run evaluate -- --review ... --labels ... --json
```

The CLI exits non-zero only when an imported AI proposal is invalid. Missing or unlabelled
evidence does not fail the command.

## Label file

An array of objects:

```json
[
  {
    "questionId": "SEC-001",
    "source": "docs/topics/security.txt",
    "line": 96,
    "relevant": true,
    "evidenceId": "SEC-001-E5",
    "label": "CSRF protection"
  }
]
```

- `source` is matched as a case-insensitive substring of the candidate source; for discussions
  use `"PR #123"` or `"Issue #123"`.
- `line` must match exactly when it is a number. Use `null` for issue/PR discussions.
- `relevant` is the human/reviewer judgment. A "relevant" passage counts toward recall; an
  "irrelevant" candidate counts as a false positive.
- `evidenceId` is informational; matching is by question, source and line so labels survive a
  re-run with new candidate IDs.

## Metrics

- **Precision:** relevant labelled candidates / all labelled candidates. Unlabelled candidates
  are reported separately and excluded from the denominator.
- **Recall:** relevant labels found / all relevant labels.
- **Missed relevant:** labelled relevant passages the sampled evidence did not surface.
- **False positives:** labelled irrelevant candidates that the evidence did find.

These are small-sample diagnostics, not a conformance score. Do not publish them as a general
quality percentage.

## AI proposals

For every `aiProposal` in the review, the evaluator checks:

- the question exists;
- the suggested answer is one of `needs-investigation`, `met`, `not-met`, `not-applicable`;
- every cited evidence ID exists on that question;
- `importedFor.repository`, `commitSha`, `presetId` and `presetVersion` match the review.

A missing binding or any mismatch makes the proposal invalid. The evaluator never approves a
proposal; human decisions remain separate.

## Reproducing a review for evaluation

1. Run discovery and analysis in the app.
2. Record human answers/rationales, then download the review JSON.
3. Optionally copy the AI evidence prompt into your own provider, import the returned JSON as
   unapproved suggestions, and download the review JSON again.
4. Run the evaluator with your labels.

The label file is the human answer key. Keep it under version control when it is safe to do
so, and record the repository and commit it applies to.

## Limits

- The recorded Django labels are AI-assisted, not independently human-confirmed.
- The fixture predates the F8 word-boundary/negation change; re-measure when labels are
  confirmed and after evidence-matching changes.
- The evaluator scores the candidates that were produced by the current sample; it cannot
  measure passages that were never selected or fetched.
- No screen-reader or browser-AT testing is implied by these numbers.
