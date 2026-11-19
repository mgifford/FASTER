import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGitHubUrl,safeRef,safeRepositoryPath,selectFiles,findEvidence,newReview,applyReviewerDecision,toMarkdown,validateAIProposals,toAIPrompt} from '../src/review-core.js';
const question={id:'A11Y-001',area:'accessibility',prompt:'Accessible name?',why:'Meaningful names.'};
const cfg={reviewAreas:[{id:'accessibility',title:'Accessibility'}]};
function fixtureReview(){
  const evidence=findEvidence({files:[{path:'spec.md',content:'# Accessibility\nImplementations MUST expose an accessible name for the control.',kind:'spec-text'}],issues:[{number:3,title:'Keyboard gap',body:'Should check accessible name',html_url:'https://github.com/org/repo/issues/3'}],rules:[{questionId:question.id,phrases:['accessible name']}],questions:[question],repoUrl:'https://github.com/org/repo',sha:'abc123'});
  return newReview({repo:{owner:'org',repo:'repo',url:'https://github.com/org/repo'},sha:'abc123',selectedAreas:['accessibility'],questions:[question],evidence,sourceConfig:cfg,fileSummary:['spec.md']});
}
test('GitHub URL validation forbids offsite URLs and extra paths',()=>{
  assert.deepEqual(parseGitHubUrl('https://github.com/org/repo/'),{owner:'org',repo:'repo',url:'https://github.com/org/repo'});
  for(const bad of ['https://evil.example/owner/repo','http://github.com/org/repo','https://github.com/org/repo/issues','https://github.com@evil.com/org/repo','https://github.com/org/repo?token=x'])assert.throws(()=>parseGitHubUrl(bad));
});
test('Safe refs and deterministic selection',()=>{
  assert.equal(safeRef('main'),'main');assert.throws(()=>safeRef('../secrets'));
  const docs=selectFiles([{path:'index.html',size:100,type:'blob'},{path:'image.png',size:100,type:'blob'},{path:'src/tool.js',size:100,type:'blob'}]);
  assert.equal(docs.length,1);assert.equal(docs[0].path,'index.html');
});
test('Evidence is a candidate with pinned source, not automatically met',()=>{
  const review=fixtureReview();
  assert.equal(review.questions[0].answer,'needs-investigation');
  assert.equal(review.questions[0].reviewState,'unreviewed');
  assert.equal(review.questions[0].evidence.length,2);
  assert.match(review.questions[0].evidence[0].url,/blob\/abc123\/spec.md#L2$/);
});
test('Review action is explicit, separate from AI suggestion',()=>{
  const review=fixtureReview();
  assert.throws(()=>applyReviewerDecision(review.questions[0],'yes'));
  const next=applyReviewerDecision(review.questions[0],'met','Verified this clause');
  assert.equal(next.reviewState,'human-reviewed');
  assert.equal(next.reviewerRationale,'Verified this clause');
});
test('AI proposal references must be actual evidence IDs',()=>{
  const review=fixtureReview();
  assert.throws(()=>validateAIProposals([{questionId:'A11Y-001',suggestedAnswer:'met',explanation:'X',evidenceIds:['FAKE']}],review));
  assert.equal(validateAIProposals([{questionId:'A11Y-001',suggestedAnswer:'needs-investigation',explanation:'Need full text',evidenceIds:['A11Y-001-E1']}],review).length,1);
});
test('Markdown retains commit, state, source and human rationale',()=>{
  const review=fixtureReview();
  review.questions[0]=applyReviewerDecision(review.questions[0],'not-met','No adequate mechanism');
  const md=toMarkdown(review);assert.match(md,/abc123/);assert.match(md,/not-met/);assert.match(md,/No adequate mechanism/);assert.match(md,/spec.md/);
  assert.match(toAIPrompt(review),/UNTRUSTED DATA/);
});

test('Optional relative document is prioritized; traversal is rejected',()=>{
  assert.equal(safeRepositoryPath('docs/guide.md'),'docs/guide.md');
  for(const bad of ['../secrets','/absolute/path','docs/../other.md','docs//bad.md','docs/spec.md?x=1']) assert.throws(()=>safeRepositoryPath(bad));
  const tree=[{path:'README.md',size:100,type:'blob'},{path:'docs/guide.md',size:100,type:'blob'},{path:'docs/else.md',size:100,type:'blob'}];
  assert.equal(selectFiles(tree,{preferredDocumentPath:'docs/guide.md',maxDocs:1})[0].path,'docs/guide.md');
});
test('Review tracks generic preset, scoping metadata, discussions and provenance',()=>{
  const q={id:'SUS-001',area:'sustainability',prompt:'Describe resource impacts?',why:'Review lifecycle.'};
  const evidence=findEvidence({files:[{path:'docs/impact.md',content:'Energy usage is described.',kind:'repository-document'}],issues:[{number:7,title:'Energy usage missing',body:'Need energy budget',html_url:'https://github.com/owner/repo/pull/7',kind:'pull-request-discussion',state:'open'}],rules:[{questionId:q.id,phrases:['energy']}],questions:[q],repoUrl:'https://github.com/owner/repo',sha:'deadbeef'});
  const review=newReview({repo:{url:'https://github.com/owner/repo'},sha:'deadbeef',questions:[q],evidence,selectedAreas:['sustainability'],sourceConfig:{reviewAreas:[{id:'sustainability',title:'Sustainability'}]},fileSummary:['docs/impact.md'],issueSummary:['pull-request-discussion #7 (open)'],preset:{id:'general',title:'General cross-cutting review',kind:'community-starter',status:'experimental'},context:{targetType:'service',reviewPurpose:'Readiness review',requestedDocument:'docs/impact.md'}});
  assert.equal(review.preset.id,'general');assert.equal(review.context.targetType,'service');
  assert.match(toMarkdown(review),/Readiness review/);
  assert.match(toMarkdown(review),/pull-request-discussion #7/);
  assert.ok(review.questions[0].evidence.some(x=>x.sourceAuthority==='discussion-only'));
  assert.equal(review.questions[0].answer,'needs-investigation');
  assert.match(toAIPrompt(review),/DRAFT evidence-assisted repository review/);
});
