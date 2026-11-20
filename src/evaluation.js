import {REVIEW_STATES} from './review-core.js';

function normalized(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase();
}

function matchesLabel(candidate, label) {
  if (candidate.questionId !== label.questionId) return false;
  if (label.source && !normalized(candidate.source).includes(normalized(label.source))) return false;
  if (label.line !== null && label.line !== undefined && Number(label.line) !== Number(candidate.line)) return false;
  return true;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

function questionMetrics(labels, candidates, questionId) {
  const relevant = labels.filter(label => label.questionId === questionId && label.relevant);
  const found = relevant.filter(label => label.found);
  const questionCandidates = candidates.filter(candidate => candidate.questionId === questionId);
  const labelled = questionCandidates.filter(candidate => candidate.relevance !== null);
  const truePositives = labelled.filter(candidate => candidate.relevance === true).length;
  const falsePositives = labelled.filter(candidate => candidate.relevance === false).length;
  return {
    relevantLabels: relevant.length,
    foundRelevant: found.length,
    missedRelevant: relevant.length - found.length,
    candidates: questionCandidates.length,
    truePositives,
    falsePositives,
    precision: ratio(truePositives, truePositives + falsePositives),
    recall: ratio(found.length, relevant.length)
  };
}

export function evaluateEvidence(review, labels) {
  if (!review || !Array.isArray(review.questions)) throw new Error('Expected a review object with a questions array.');
  if (!Array.isArray(labels) || !labels.length) throw new Error('Expected a non-empty labels array.');
  const knownQuestions = new Set(review.questions.map(question => question.id));
  const candidates = [];
  for (const question of review.questions) {
    for (const evidence of question.evidence || []) {
      candidates.push({
        questionId: question.id,
        evidenceId: evidence.id,
        source: evidence.source,
        line: evidence.line,
        snippet: evidence.snippet,
        url: evidence.url,
        evidenceType: evidence.evidenceType,
        matchedTerms: evidence.matchedTerms || [],
        negated: Boolean(evidence.negated)
      });
    }
  }
  const used = new Set();
  const rows = labels.map(label => {
    const match = candidates.find(candidate => !used.has(candidate) && matchesLabel(candidate, label));
    if (match) used.add(match);
    return {
      ...label,
      questionKnown: knownQuestions.has(label.questionId),
      found: Boolean(match),
      evidenceId: match?.evidenceId || null,
      snippet: match?.snippet || null
    };
  });
  const labelledCandidates = candidates.map(candidate => {
    const label = rows.find(row => row.questionKnown && matchesLabel(candidate, row));
    return {...candidate, relevance: label ? label.relevant : null, label: label?.label || null};
  });
  const relevantLabels = rows.filter(row => row.relevant);
  const foundRelevant = relevantLabels.filter(row => row.found);
  const truePositives = labelledCandidates.filter(candidate => candidate.relevance === true).length;
  const falsePositives = labelledCandidates.filter(candidate => candidate.relevance === false).length;
  const unlabelled = labelledCandidates.filter(candidate => candidate.relevance === null).length;
  const metrics = {
    labels: rows.length,
    relevantLabels: relevantLabels.length,
    foundRelevant: foundRelevant.length,
    missedRelevant: relevantLabels.length - foundRelevant.length,
    candidates: candidates.length,
    labelledCandidates: truePositives + falsePositives,
    unlabelledCandidates: unlabelled,
    truePositives,
    falsePositives,
    precision: ratio(truePositives, truePositives + falsePositives),
    recall: ratio(foundRelevant.length, relevantLabels.length)
  };
  const questionIds = [...new Set([...knownQuestions, ...rows.map(row => row.questionId)])];
  const byQuestion = questionIds.map(id => ({questionId:id, ...questionMetrics(rows, labelledCandidates, id)}));

  const proposals = [];
  for (const question of review.questions) {
    if (!question.aiProposal) continue;
    const proposal = question.aiProposal;
    const issues = [];
    if (!knownQuestions.has(question.id)) issues.push('unknown question');
    if (!REVIEW_STATES.includes(proposal.suggestedAnswer)) issues.push('invalid suggestedAnswer');
    if (!Array.isArray(proposal.evidenceIds)) issues.push('evidenceIds is not an array');
    else {
      const evidenceIds = new Set((question.evidence || []).map(evidence => evidence.id));
      if (proposal.evidenceIds.some(id => !evidenceIds.has(id))) issues.push('cites unknown evidence');
    }
    const binding = proposal.importedFor;
    if (!binding) issues.push('missing import binding');
    else if (binding.repository !== review.repository?.url || binding.commitSha !== review.commitSha || (binding.presetId || null) !== (review.preset?.id || null) || (binding.presetVersion || null) !== (review.preset?.version || null)) issues.push('binding does not match review');
    proposals.push({questionId:question.id, suggestedAnswer:proposal.suggestedAnswer, issues, valid:issues.length === 0});
  }
  return {
    repository: review.repository?.url || null,
    commitSha: review.commitSha || null,
    rows,
    candidates: labelledCandidates,
    metrics,
    byQuestion,
    aiProposals: {
      total: proposals.length,
      valid: proposals.filter(proposal => proposal.valid).length,
      invalid: proposals.filter(proposal => !proposal.valid).length,
      proposals
    }
  };
}
