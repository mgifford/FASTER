# User experience and wireframes

The audience includes non-technical project maintainers, standards editors, procurement specialists, and expert auditors. **Do not present an overwhelming questionnaire before the tool has collected available evidence.**

## Screen 1: Minimal intake

```text
Repository Review Assistant
Analyze a public GitHub repository, then review what remains uncertain.

GitHub URL           [ https://github.com/owner/repository            ]
Branch, tag or SHA   [ Leave blank for default branch               ]
What is it?          [ Determine automatically v                    ]
Review pack          [ General cross-cutting review v               ]
Review goal          [ Optional: release readiness                  ]
Priority document    [ Optional: docs/specification.md              ]

[ ] Include a small code sample
[+] Accessibility  [+] Internationalization  [+] Privacy
[+] Security       [+] Architecture          [+] Sustainability (experimental)

[ Discover repository ]      [ Cancel ]
```

This is the implemented starter. A transparent project-type suggestion, ranked document inventory and reviewer multi-select are implemented; canonical/published-document detection and monorepo scoping remain future work.

## Screen 2: Repository inventory (implemented in Phase 1)

```text
Repository: owner/repository                   Commit: 93c8...
Type suggestion: library (not confirmed)
Document candidates:
  ( ) README.md         source documentation
  ( ) docs/design.md    architecture notes
  ( ) docs/spec.html    potential normative specification
[Select which documents are in scope]

Coverage: 12/38 candidate documents selected; 5 skipped as too large; 20 issues; 10 PRs
Warnings: 6 large files skipped; PR history incomplete
[Continue to questions]
```

No fabricated 'percentage complete' unless the inventory's denominator is actually known. Warn about API truncation and documents outside sampled paths.

## Screen 3: Prioritized, evidence-backed questioning

```text
Review packs: General cross-cutting review
Review progress: 4 human-reviewed, 16 unresolved

Question: Does the project document personal-data handling?
Answer: Needs investigation [v]
Candidate evidence:
  Docs/privacy.md:21  "..."       [View source]
  Issue #87 (open)      "..."       [View issue]
  PR #94 (not verified merged)       [View PR]

AI interpretation: unapproved (if manually imported)
  - potential supporting information
  - conflicting or missing evidence

Rationale / remaining question [.................................]
[Keep unresolved] [Mark after manual review]
```

In the starter, review controls are embedded in each question card; later improve ordering so 'unresolved and evidence found' questions appear first, followed by unreviewed questions with no evidence. Preserve discoverability of the complete list and screen-reader access to all states.

## Screen 4: Export and compare (first export implemented, comparison future)

```text
Review completed by: [reviewer]
Sources: exact commit, selected docs, issue/PR snapshot retrieval date
Verified human decisions: 4
Unresolved questions: 16
Unsupported claims: 0 accepted

[Download JSON] [Download Markdown]
[Compare to previous review] (future)
[Prepare GitHub issue for approval] (future)
```

## Accessibility acceptance criteria

- Sequential and predictable headings, landmarks, labels, fieldsets and accessible validation messages.
- No dependence on color or icons for state meaning. Keyboard-only and screen reader users can review the same evidence and controls.
- Respect `prefers-reduced-motion` and forced-colors; test 400% zoom and narrow viewports.
- Progress communicated via polite live regions, without a noisy announcement for every file if it becomes distracting.
- Focus moves deliberately after scans, errors and imports. Don't steal focus after background updates.
- Inputs retain values across filtering and ordinary navigation. Later include explicit undo and autosave only with consent.
- Avoid adding an AI chatbot as the only way to review evidence; every task stays accessible through ordinary controls.

## Design constraints

Keep the interface fast, simple and text-first. Show the most important next action rather than all functionality. Never hide limitations, evidence provenance or the review pack's authority status. No dark patterns or progress nudges for artificially high compliance scores.
