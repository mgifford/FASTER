import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateEvidence} from '../src/evaluation.js';

const review = JSON.parse(readFileSync(new URL('../evaluations/pilot-django-review.json', import.meta.url), 'utf8'));
const labels = JSON.parse(readFileSync(new URL('../evaluations/pilot-django-2026-11-20.json', import.meta.url), 'utf8'));

test('Pilot evaluation reproduces the recorded precision and recall',()=>{
  const result = evaluateEvidence(review, labels);
  assert.equal(result.rows.length, 25);
  assert.equal(result.metrics.relevantLabels, 19);
  assert.equal(result.metrics.foundRelevant, 14);
  assert.equal(result.metrics.missedRelevant, 5);
  assert.equal(result.metrics.falsePositives, 6);
  assert.equal(result.metrics.precision, 0.7);
  assert.ok(Math.abs(result.metrics.recall - 14 / 19) < 1e-9);
  assert.equal(result.aiProposals.total, 0);
});

test('AI proposals are checked for IDs and repository binding',()=>{
  const accepted = JSON.parse(JSON.stringify(review));
  const question = accepted.questions[0];
  question.aiProposal = {
    questionId: question.id,
    suggestedAnswer: 'needs-investigation',
    explanation: 'Bound proposal',
    evidenceIds: [question.evidence[0].id],
    importedFor: {repository: accepted.repository.url, commitSha: accepted.commitSha, presetId: accepted.preset.id, presetVersion: accepted.preset.version}
  };
  const valid = evaluateEvidence(accepted, labels);
  assert.equal(valid.aiProposals.total, 1);
  assert.equal(valid.aiProposals.valid, 1);
  assert.equal(valid.aiProposals.invalid, 0);

  const rejected = JSON.parse(JSON.stringify(accepted));
  rejected.questions[0].aiProposal.evidenceIds = ['DOES-NOT-EXIST'];
  rejected.questions[0].aiProposal.importedFor.commitSha = 'ffffffff';
  const invalid = evaluateEvidence(rejected, labels);
  assert.equal(invalid.aiProposals.invalid, 1);
  assert.match(invalid.aiProposals.proposals[0].issues.join(' '), /unknown evidence/);
  assert.match(invalid.aiProposals.proposals[0].issues.join(' '), /binding does not match review/);
});
