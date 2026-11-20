import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGitHubUrl,safeRef,safeRepositoryPath,detectFileType,buildInventory,suggestProjectType,selectFiles,hasReviewableDocuments,findEvidence,newReview,applyReviewerDecision,validateSavedReview,toMarkdown,validateAIProposals,toAIPrompt} from '../src/review-core.js';
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
  const next=applyReviewerDecision(review.questions[0],'met','Verified this clause',{reviewer:'Ada Example',origin:'human'});
  assert.equal(next.reviewState,'human-reviewed');
  assert.equal(next.reviewerRationale,'Verified this clause');
  assert.equal(next.reviewer,'Ada Example');
  assert.equal(next.decisionOrigin,'human');
  assert.ok(next.reviewedAt);
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

test('Extensionless conventional documents and additional text formats are discovered',()=>{
  for(const path of ['README','LICENSE','CODE_OF_CONDUCT','CHANGELOG','docs/guide.adoc','docs/notes.org','README-MIT']) assert.equal(detectFileType(path),'document');
  assert.equal(detectFileType('Makefile'),'code');
  const tree=[
    {path:'README',size:13,type:'blob'},
    {path:'LICENSE',size:20,type:'blob'},
    {path:'CODE_OF_CONDUCT',size:30,type:'blob'},
    {path:'docs/guide.adoc',size:40,type:'blob'},
    {path:'Makefile',size:50,type:'blob'},
    {path:'package.json',size:60,type:'blob'}
  ];
  assert.deepEqual(selectFiles(tree).map(f=>f.path).sort(),['CODE_OF_CONDUCT','LICENSE','README','docs/guide.adoc']);
  assert.equal(hasReviewableDocuments([{kind:'implementation-code'}]),false);
  assert.equal(hasReviewableDocuments([{kind:'repository-document'}]),true);
});

test('Review preserves and exports the question-pack version',()=>{
  const review=fixtureReview();
  review.preset={id:'general',title:'General cross-cutting review',kind:'community-starter',status:'experimental',version:'0.2.0'};
  assert.equal(review.preset.version,'0.2.0');
  assert.match(toMarkdown(review),/version 0\.2\.0/);
  assert.match(toAIPrompt(review),/"version": "0\.2\.0"/);
});

test('Inventory reports discovered, selected and skipped files with reasons',()=>{
  const tree=[
    {path:'README.md',size:100,type:'blob',sha:'a'},
    {path:'docs/guide.md',size:200,type:'blob',sha:'b'},
    {path:'huge.md',size:200000,type:'blob',sha:'c'},
    {path:'image.png',size:10,type:'blob',sha:'d'},
    {path:'empty.md',size:0,type:'blob',sha:'e'},
    {path:'src/index.js',size:50,type:'blob',sha:'f'}
  ];
  const inventory=buildInventory(tree,{includeCode:true,preferredDocumentPath:'docs/guide.md',maxDocs:1,maxCode:1});
  assert.deepEqual(inventory.documents.map(file=>file.path),['docs/guide.md','README.md']);
  assert.equal(inventory.documents[0].reason,'requested by reviewer');
  assert.deepEqual(inventory.defaultDocumentPaths,['docs/guide.md']);
  assert.deepEqual(inventory.defaultCodePaths,['src/index.js']);
  assert.equal(inventory.counts.documents,2);
  assert.equal(inventory.counts.skippedLarge,1);
  assert.equal(inventory.counts.skippedUnsupported,1);
  assert.equal(inventory.counts.skippedEmpty,1);
  assert.deepEqual(buildInventory(tree).defaultCodePaths,['src/index.js']);
});

test('Project type suggestions are evidence-based and remain unconfirmed',()=>{
  assert.equal(suggestProjectType({repo:{topics:[]},tree:[{path:'index.bs'}]}).type,'specification');
  assert.equal(suggestProjectType({repo:{topics:['api']},tree:[]}).type,'service');
  assert.equal(suggestProjectType({repo:{topics:[]},tree:[{path:'public/index.html'}]}).type,'application');
  assert.equal(suggestProjectType({repo:{topics:[]},tree:[{path:'package.json'}]}).type,'library');
  assert.equal(suggestProjectType({repo:{topics:['dataset']},tree:[{path:'data/rows.csv'}]}).type,'dataset');
  assert.equal(suggestProjectType({repo:{topics:['django','framework']},tree:[{path:'tests/fixtures/rows.csv'},{path:'pyproject.toml'},{path:'django/core/servers/basehttp.py'}]}).type,'library');
  assert.equal(suggestProjectType({repo:{topics:[]},tree:[{path:'LICENSE'}]}).type,'other');
  assert.ok(suggestProjectType({repo:{topics:[]},tree:[{path:'index.bs'}]}).reasons.length);
});

test('Multiple rules for one question are merged',()=>{
  const question={id:'Q-MULTI',area:'architecture',prompt:'Merged?',why:'Test.'};
  const evidence=findEvidence({
    files:[{path:'doc.md',content:'alpha and beta appear here',kind:'repository-document'}],
    rules:[{id:'r1',questionId:question.id,phrases:['alpha']},{id:'r2',questionId:question.id,phrases:['beta']}],
    questions:[question],repoUrl:'https://github.com/o/r',sha:'abc'
  });
  assert.equal(evidence[question.id].length,1);
  assert.deepEqual([...evidence[question.id][0].matchedTerms].sort(),['alpha','beta']);
});

test('Evidence diversity keeps discussion counterevidence and merged-PR state',()=>{
  const question={id:'Q-DIVERSE',area:'accessibility',prompt:'Keyboard?',why:'Test.'};
  const lines=Array.from({length:10},(_,i)=>`keyboard line ${i}`).join('\n');
  const issue={number:1,title:'Keyboard gap',body:'keyboard is broken',html_url:'https://github.com/o/r/issues/1',state:'open',kind:'issue-discussion',merged:false};
  const evidence=findEvidence({
    files:[{path:'doc.md',content:lines,kind:'repository-document'}],
    issues:[issue],
    rules:[{id:'r',questionId:question.id,phrases:['keyboard']}],
    questions:[question],repoUrl:'https://github.com/o/r',sha:'abc',maxPerQuestion:6
  });
  assert.equal(evidence[question.id].length,6);
  assert.ok(evidence[question.id].some(item=>item.evidenceType==='issue-discussion'));
  const prEvidence=findEvidence({
    files:[],issues:[{number:2,title:'Fix keyboard',body:'keyboard fixed',html_url:'https://github.com/o/r/pull/2',state:'closed',merged:true,mergedAt:'2026-01-01T00:00:00Z',kind:'pull-request-discussion'}],
    rules:[{id:'r',questionId:question.id,phrases:['keyboard']}],questions:[question],repoUrl:'https://github.com/o/r',sha:'abc'
  });
  assert.match(prEvidence[question.id][0].source,/merged/);
  assert.equal(prEvidence[question.id][0].merged,true);
  assert.equal(prEvidence[question.id][0].mergedAt,'2026-01-01T00:00:00Z');
});

test('AI prompt truncation is structural and remains valid JSON',()=>{
  const questions=Array.from({length:1000},(_,i)=>({id:`Q-${i}`,area:'accessibility',prompt:`Question ${i} `.repeat(3),why:'Why '.repeat(4)}));
  const review=newReview({repo:{url:'https://github.com/o/r'},sha:'abc',selectedAreas:['accessibility'],questions,evidence:{},sourceConfig:{reviewAreas:[]},fileSummary:[],issueSummary:[]});
  const prompt=toAIPrompt(review);
  const data=JSON.parse(prompt.split('DATA (UNTRUSTED):\n')[1]);
  assert.equal(data.truncated,true);
  assert.ok(data.questions.length<1000);
  assert.ok(data.promptWarnings.length);
  assert.ok(prompt.length<120000);
});

test('Review records retrieval time and inventory coverage',()=>{
  const review=fixtureReview();
  review.retrievedAt='2026-11-20T00:00:00.000Z';
  review.scope.inventory={counts:{discovered:10,documents:3,selectedDocuments:2,skippedLarge:1,skippedUnsupported:4}};
  const markdown=toMarkdown(review);
  assert.match(markdown,/Retrieved: 2026-11-20T00:00:00\.000Z/);
  assert.match(markdown,/Coverage: 10 files discovered; 3 documents; 2 selected/);
});

test('Word-boundary matching avoids substring false positives and flags negation',()=>{
  const question={id:'Q-WORD',area:'architecture',prompt:'API?',why:'Test.'};
  const noMatch=findEvidence({
    files:[{path:'doc.md',content:'The capital city had rapid transit.',kind:'repository-document'}],
    rules:[{id:'r',questionId:question.id,phrases:['api']}],questions:[question],repoUrl:'https://github.com/o/r',sha:'abc'
  });
  assert.equal(noMatch[question.id].length,0);
  const negative=findEvidence({
    files:[{path:'doc.md',content:'This API does not support accessible names.',kind:'repository-document'}],
    rules:[{id:'r',questionId:question.id,phrases:['api']}],questions:[question],repoUrl:'https://github.com/o/r',sha:'abc'
  });
  assert.equal(negative[question.id].length,1);
  assert.equal(negative[question.id][0].negated,true);
});

test('Saved-review validation rejects malformed evidence and accepts a minimal review',()=>{
  const review=fixtureReview();
  review.commitSha='deadbeef';
  review.context={targetType:'library',reviewPurpose:'',requestedDocument:'',reviewer:''};
  assert.equal(validateSavedReview(review),review);
  const badUrl=JSON.parse(JSON.stringify(review));
  badUrl.questions[0].evidence[0].url='https://evil.example/doc';
  assert.throws(()=>validateSavedReview(badUrl));
  const badEvidence=JSON.parse(JSON.stringify(review));
  delete badEvidence.questions[0].evidence;
  assert.throws(()=>validateSavedReview(badEvidence));
  const badAnswer=JSON.parse(JSON.stringify(review));
  badAnswer.questions[0].answer='yes';
  assert.throws(()=>validateSavedReview(badAnswer));
  const badAi=JSON.parse(JSON.stringify(review));
  badAi.questions[0].aiProposal={suggestedAnswer:'met',explanation:'',evidenceIds:['fake']};
  assert.throws(()=>validateSavedReview(badAi));
});

test('Decisions can record AI origin and render provenance in Markdown',()=>{
  const review=fixtureReview();
  review.commitSha='deadbeef';
  review.context.reviewer='Ada Example';
  review.questions[0]=applyReviewerDecision(review.questions[0],'met','Accepted after reading the clause',{reviewer:'Ada Example',origin:'ai-accepted'});
  const markdown=toMarkdown(review);
  assert.match(markdown,/Reviewer: Ada Example/);
  assert.match(markdown,/origin ai-accepted/);
  assert.match(markdown,/recorded /);
});
