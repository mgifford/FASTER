# Data model and versioning

## Review pack registry

`data/presets.json` lists installed packs. Each pack provides:

- `id`, `version`, `title`, `kind`, `status`, `description`.
- `sources`: explanatory authority and reference links per review area.
- `questions`: original exploratory prompts with IDs, area, prompt and rationale.
- `rules`: deterministic search phrases keyed to IDs.
- `defaultAreas`: initial checkbox selection.

A pack is **not** official solely because it links to a source. For authoritative imported questionnaires add `sourceUrl`, `sourceVersion`, `retrievedAt`, `license`, `adoptionStatus`, `provenanceDigest`, `originalQuestionId`, and transformation notes. Retain exact text only if permission and accuracy are established. Never merge revisions silently.

Minimal proposed external pack manifest:

```json
{
  "id": "example-review-pack",
  "version": "1.0.0",
  "status": "community-draft",
  "license": "AGPL-3.0-only",
  "provenance": {"sourceUrl": "https://example.org/", "sourceVersion": "2026-11-01"},
  "areas": [{"id": "inclusive-design", "title": "Inclusive design"}],
  "questions": [{
    "id": "EX-001", "area": "inclusive-design",
    "text": "What barriers were identified?",
    "applicability": {"projectTypes": ["application", "service"]},
    "evidenceHints": ["accessibility", "usability testing"]
  }]
}
```

This future manifest is **illustrative**, not the current loader schema. The current pack schema is validated with `npm run validate`.

## Review record (implemented)

The exported review JSON includes:

```json
{
  "schemaVersion": "0.2.0",
  "generatedAt": "2026-11-19T00:00:00.000Z",
  "retrievedAt": "2026-11-19T00:00:00.000Z",
  "repository": {"url": "https://github.com/owner/repository"},
  "commitSha": "<resolved-commit>",
  "publishedLinks": [],
  "preset": {"id": "general", "title": "General cross-cutting review", "kind": "community-starter", "status": "experimental", "version": "0.2.0"},
  "context": {"targetType": "library", "reviewPurpose": "readiness review", "requestedDocument": "", "scopePath": "", "reviewer": "Ada Example"},
  "selectedAreas": ["accessibility", "security"],
  "scope": {
    "filesInspected": [],
    "discussionsInspected": [],
    "warnings": [],
    "inventory": {"discovered": 35, "documents": 5, "code": 23, "selectedDocuments": 5, "selectedCode": 4, "skippedLarge": 0, "skippedUnsupported": 7, "skippedEmpty": 0}
  },
  "questions": [{
    "id": "ACC-001",
    "answer": "needs-investigation",
    "reviewState": "unreviewed",
    "evidence": [],
    "reviewerRationale": "",
    "reviewedAt": null,
    "reviewer": "",
    "decisionOrigin": null,
    "aiProposal": null
  }]
}
```

The inventory is the discovery result, not proof that every file was inspected. `filesInspected` lists only successfully fetched sources; `retrievedAt` records when the discussion/source snapshot was taken. The example is schematic and does not claim that `owner/repository` exists or has been scanned.

## Evidence requirements

Record `id`, `questionId`, `source`, `url`, `line` if available, `evidenceType`, `sourceAuthority`, `strength`, `snippet`, matched phrases, section context, possible-normative/negation/contradiction hints, duplicate sources, labels and discussion timestamps where available. Future evidence records should include retrieval time, content hash, normative/informative classification, source version, temporal validity, contradiction markers and note whether an issue/PR was merged.

**Source hierarchy matters:** normative specification > approved decision/release metadata > actual implementation/tests > explanatory documentation > open issues/unmerged PRs > LLM interpretation. The exact order varies by the type of claim. For example, code can verify code behavior but cannot alone demonstrate specification normative guarantees.

## Distinct states

Do not collapse these dimensions:

- Human answer: `needs-investigation`, `met`, `not-met`, `not-applicable` (starter's labels, **not official W3C outcomes**).
- Reviewer process: `unreviewed` or `human-reviewed` (future: needs clarification, disputed, signed-off).
- Machine proposal: separate untrusted suggestion with cited evidence IDs; never overwrite human answer.
- Evidence: keyword candidate, directly quoted provision, implementation observation, issue discussion, or contradictory evidence.
- Questionnaire authority: original starter, community draft, published guidance, or officially adopted requirement.

## Sample AI proposal (accepted by importer but not by review)

```json
[
  {
    "questionId": "ACC-001",
    "suggestedAnswer": "needs-investigation",
    "explanation": "No direct requirement is established by the sampled excerpts.",
    "evidenceIds": []
  }
]
```

Use actual question and evidence IDs from the analyzed pack. The importer rejects unknown references, records the import binding (`repository`, `commitSha`, `presetId`, `presetVersion`) and leaves all decisions unapproved. A later human decision records `reviewedAt`, `reviewer` and `decisionOrigin` (`human` or `ai-accepted`).
