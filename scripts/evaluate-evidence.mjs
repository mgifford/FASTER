import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {evaluateEvidence} from '../src/evaluation.js';

const args = process.argv.slice(2);
const value = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/evaluate-evidence.mjs [--review <review.json>] [--labels <labels.json>] [--json]

Compares a saved review's evidence candidates with a labelled passage file.
Optional AI proposals are checked for question/evidence IDs and import binding.
No model or network call is made.`);
  process.exit(0);
}
const reviewPath = resolve(value('--review') || 'evaluations/pilot-django-review.json');
const labelsPath = resolve(value('--labels') || 'evaluations/pilot-django-2026-11-20.json');
const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
const labelsFile = JSON.parse(readFileSync(labelsPath, 'utf8'));
const labels = Array.isArray(labelsFile) ? labelsFile : labelsFile.labels;
if (!Array.isArray(labels)) throw new Error('Labels file must be an array or contain a labels array.');
const result = evaluateEvidence(review, labels);

const pct = value => value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
if (args.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`# Evidence evaluation${result.repository ? `: ${result.repository}` : ''}${result.commitSha ? ` @ ${result.commitSha.slice(0, 12)}` : ''}\n`);
  console.log(`- Labelled passages: ${result.metrics.labels}`);
  console.log(`- Relevant passages: ${result.metrics.relevantLabels}`);
  console.log(`- Candidates: ${result.metrics.candidates} (${result.metrics.unlabelledCandidates} unlabelled)`);
  console.log(`- Relevant found: ${result.metrics.foundRelevant}`);
  console.log(`- Relevant missed: ${result.metrics.missedRelevant}`);
  console.log(`- False positives: ${result.metrics.falsePositives}`);
  console.log(`- Precision: **${pct(result.metrics.precision)}**`);
  console.log(`- Recall: **${pct(result.metrics.recall)}**\n`);
  console.log('| Question | Source | Line | Relevance | Found | Evidence |');
  console.log('| --- | --- | ---: | --- | --- | --- |');
  for (const row of result.rows) {
    console.log(`| ${row.questionId} | ${String(row.source).replaceAll('|', '\\|')} | ${row.line ?? ''} | ${row.relevant ? 'relevant' : 'irrelevant'} | ${row.found ? 'yes' : '**missed**'} | ${row.evidenceId || '—'} |`);
  }
  if (result.aiProposals.total) {
    console.log(`\n## AI proposals\n`);
    console.log(`- Total: ${result.aiProposals.total}`);
    console.log(`- Valid: ${result.aiProposals.valid}`);
    console.log(`- Invalid: ${result.aiProposals.invalid}`);
    for (const proposal of result.aiProposals.proposals.filter(item => !item.valid)) {
      console.log(`- ${proposal.questionId}: ${proposal.issues.join('; ')}`);
    }
  } else {
    console.log('\nNo AI proposals in this review.');
  }
}
process.exitCode = result.aiProposals.invalid ? 1 : 0;
