# Governance, authority and framework relationships

**This project is generic.** Frameworks are plugins and should not redefine the core tool. A review pack's authority must be explicit and distinct from the evidence a repository provides.

## Initial packs

1. **General cross-cutting review (default):** 20 original non-normative triage questions, no formal reviewing body or conformance status.
2. **W3C horizontal review preparation (optional):** 22 original high-level questions aligning to areas covered by W3C's five formal horizontal-review groups. These are **not** the published FAST/i18n/privacy/security/TAG questions and do not constitute formal review.
3. **Sustainability:** Experimental questions in both packs. In November 2026, W3C formally lists five horizontal groups: APA accessibility, Internationalization, Privacy, Security, and TAG architecture. Sustainability is **not** a sixth official horizontal group. Consult https://www.w3.org/guide/process/horizontal-groups .

## Authoritative resources to integrate later

| Subject | Resource | Integration rule |
| --- | --- | --- |
| Accessibility specification self-review | https://w3c.github.io/fast/checklist.html and https://github.com/w3c/fast | Preserve checkpoint IDs and content provenance; do not treat implementation testing as FAST approval. |
| Internationalization | https://www.w3.org/International/i18n-drafts/pages/review-request.en and https://www.w3.org/International/i18n-drafts/techniques/shortchecklist.en | Preserve authored question and context versions. |
| Privacy + security | https://www.w3.org/TR/security-privacy-questionnaire/ | Shared questionnaire; avoid duplicating questions with inconsistent answers. |
| Web architecture | https://www.w3.org/TR/design-principles/ and https://tag.w3.org/workmode/design-reviews/ | Principles are not a binary conformance checklist. |
| Sustainability | https://www.w3.org/TR/web-sustainability-guidelines/ and https://github.com/w3c/sustainableweb-wsg | Treat sustainability *horizontal-review* questions as experimental and distinct from WSG product guidance. |
| Official W3C review process | https://www.w3.org/guide/documentreview/ | Tool prepares evidence; does not file or replace an actual group review. |

## Other applicable review methods

- **WCAG-EM** is an evaluation methodology for websites and, in the 2026 version, other digital products. It is not a framework for verifying a technology specification.
- **OpenACR** is a structured Accessibility Conformance Report format; it reports conformance claims for products/services and is not an assessment engine.
- **FAST** is a review framework for accessibility of **technology specifications**. It is not an automated website accessibility test.
- **ACT Rules** describe accessibility testing rules. An ACT result can provide implementation evidence but not automatically decide a FAST question.
- **WSG** provides sustainability guidance for digital products/services. Its published guidance should not be silently converted into an official sustainability horizontal-review questionnaire.

## Publication and rights

Official source material has its own publication and copyright/license conditions. Link to original material by default; do not bulk-import exact normative question text unless its license and transformation process are verified. Store source version, release date, retrieval date, section ID, and diffs. Label adaptations as adaptations, not original W3C text. Proposed changes to an official checklist should be submitted through the owning project's governance process.

## Human accountability

Every external review submission must identify the responsible person or group and the precise document commit or publication version. An AI system may collect evidence or suggest answers but cannot speak for APA, i18n, Privacy WG, Security IG, TAG, the Sustainable Web IG, or any other organization. Do not automatically open tracking issues or claim review completion.
