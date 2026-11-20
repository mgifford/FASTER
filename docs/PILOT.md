# Pilot 1: Django security and internationalization evidence

Status: **preliminary, AI-assisted labels — not yet Phase 1 acceptance.** A human reviewer must
independently confirm or replace these 25 labels before the pilot is treated as a validated
answer key. The candidate list was measured before the F8 word-boundary change and the later
section/normative/deduplication hints; re-measure after human confirmation.

| Item | Value |
| --- | --- |
| Repository | `https://github.com/django/django` (public, non-W3C) |
| Pinned commit | `c67d872765e05ebd009fadf7de8d834b01bae9e4` |
| Retrieval date | 2026-11-20 (UTC) |
| Review areas | Security; internationalization |
| Selected documents | `docs/topics/security.txt`, `docs/internals/security.txt`, `docs/releases/security.txt`, `.github/SECURITY.md`, `docs/topics/i18n/index.txt` |
| Code sample | Not included for this pilot |
| Issue/PR sample | 10 discussions |
| Inventory | 7,104 discovered blobs; 1,112 documents; 2,581 code files; 14 too large; 2,774 unsupported; 623 empty |
| Type suggestion | `library` (correct for Django; requires confirmation) |
| GitHub API budget after run | 38/60 remaining |
| Tool output | 20 candidates (10 per question), 0 automatic decisions |

## Method

1. Ran discovery through the browser/API path with the project-type suggestion left unconfirmed.
2. Selected the five documents above from the inventory; code sampling was disabled.
3. Ran two original review probes:
   - **I18N-001:** Does the documentation explain locale-aware formats, translation and Unicode handling?
   - **SEC-001:** Does the documentation address threats, trust boundaries and vulnerability handling?
4. Compared the 10 candidates per question with the labelled passages below.

The labels are my initial reading of the source. They are **not** independent human
adjudication. Two relevant i18n passages and three relevant security passages were deliberately
checked after the run to measure recall rather than only precision.

## Results

| Area | Candidates | Relevant found | False positives | Precision | Labelled relevant | Relevant missed | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Internationalization | 10 | 6 | 4 | 60% | 8 | 2 | 75% |
| Security | 10 | 8 | 2 | 80% | 11 | 3 | 73% |
| **Overall** | **20** | **14** | **6** | **70%** | **19** | **5** | **74%** |

Precision is measured against the candidate list only. Recall is measured against the labelled
relevant passages, including passages the tool did not surface. These are small, single-repo
numbers; they are not a product compliance score.

## Labelled passages

Source lines refer to the pinned commit. "Found" means the passage appeared in the 10
candidates for that question.

### Internationalization

| Source and line | Passage | Label | Tool |
| --- | --- | --- | --- |
| `docs/topics/i18n/index.txt:17` | "languages and formats tailored to the audience" | Relevant | Found (E1) |
| `docs/topics/i18n/index.txt:20` | "translation of text ... formatting of dates, times and numbers ... time zones" | Relevant | Found (E4/E7) |
| `docs/topics/i18n/index.txt:31` | Target language/country and `Accept-Language` header | Relevant | **Missed** |
| `docs/topics/i18n/index.txt:66` | Locale-name definition (`ll` / `ll_CC`) | Relevant | **Missed** |
| `docs/internals/security.txt:191` | "Content displayed by ... must be under 100 KB" | Irrelevant | Found (E2) |
| `docs/internals/security.txt:194` | DTL content-building description | Irrelevant | Found (E5) |
| `docs/internals/security.txt:248` | Large language models / AI tooling | Irrelevant | Found (E8) |
| `docs/releases/security.txt:386` | Unicode denial-of-service fix in `URLField` | Relevant | Found (E9) |
| `docs/releases/security.txt:164` | `check_for_language()` denial-of-service fix | Relevant | Found (E6) |
| `docs/releases/security.txt:109` | `get_supported_language_variant()` | Relevant | Found (E3) |
| PR #21970 (open) | ORM query mentioning `translation` | Irrelevant | Found (E10) |

### Security

| Source and line | Passage | Label | Tool |
| --- | --- | --- | --- |
| `docs/topics/security.txt:2` | "Security in Django" | Relevant | Found (E3) |
| `docs/topics/security.txt:5` | Overview of Django security features | Relevant | Found (E9) |
| `docs/topics/security.txt:33` | Cross-site scripting (XSS) protection | Relevant | **Missed** |
| `docs/topics/security.txt:96` | Cross-site request forgery (CSRF) protection | Relevant | **Missed** |
| `docs/topics/security.txt:128` | SQL injection protection | Relevant | **Missed** |
| `docs/internals/security.txt:2` | Django security policy | Relevant | Found (E1) |
| `docs/internals/security.txt:6` | Reporting and disclosure of security issues | Relevant | Found (E7) |
| `docs/releases/security.txt:2` | Archive of security issues | Relevant | Found (E2) |
| `docs/releases/security.txt:6` | Reporting and disclosure of security-related issues | Relevant | Found (E8) |
| `.github/SECURITY.md:1` | Django security policies | Relevant | Found (E4) |
| `.github/SECURITY.md:3` | Link to the security policy | Relevant | Found (E10) |
| PR #22316 (closed) | PR-template "does not disclose a security vulnerability" | Irrelevant | Found (E5) |
| PR #22314 (open) | PR-template "does not disclose a security vulnerability" | Irrelevant | Found (E6) |

## What this pilot shows

- The inventory and pinning path works: the review cites exact paths, lines and commit.
- Generic words such as "language", "format" and "security" create false positives in
  security documentation; structured/word-boundary matching (F8) is needed.
- PR templates create repeated boilerplate matches. The two-discussion cap prevents the PR
  sample from swamping the document evidence, but a discussion-only question still needs
  human triage.
- Per-file round-robin surfaces multiple documents, but only five documents were selected;
  detailed i18n pages were not in the selection. The reviewer can now add them explicitly.
- Project-type suggestion needed two heuristic fixes found by this pilot (incidental `.csv`
  files and nested `servers/` directories); it now suggests `library` for Django.

## Limitations

- Labels are AI-assisted, not independently human-confirmed.
- One repository, two areas, five documents, ten discussions; no code sample.
- No duplicate/rephrased-passage analysis, no normative/informative classification, and no
  screen-reader or browser-AT test.
- Metric denominators are small; do not publish these percentages as a general quality score.

## Reproduce the measurement

```sh
npm run evaluate
```

This uses the recorded review and label fixtures in `evaluations/`. See
`docs/EVALUATION.md`. No model or network call is made.

## Next

1. A human reviewer confirms or replaces the 22 labels and records disagreements.
2. Repeat on a second non-W3C repository with a different documentation shape.
3. Move to word-boundary/structured matching and deduplication (F8), then re-measure.
4. Add a fetch-mocked fixture suite so this pilot is reproducible in CI (F13).
