import test from 'node:test';
import assert from 'node:assert/strict';
import {registerWebMCP} from '../src/webmcp.js';

function fixtureReview() {
  return {
    schemaVersion:'0.2.0',
    retrievedAt:'2026-11-20T00:00:00.000Z',
    repository:{url:'https://github.com/owner/repo'},
    commitSha:'abcd1234',
    preset:{id:'general',title:'General',kind:'community-starter',status:'experimental',version:'0.2.0'},
    reviewStatus:'draft',
    context:{scopePath:'docs'},
    publishedLinks:[{url:'https://example.org/spec',label:'published spec',source:'docs/index.md',line:3}],
    questionnaireSources:[{id:'accessibility',title:'Accessibility',classification:'generic-review-area',authoritativeSources:['https://www.w3.org/WAI/']}],
    scope:{inventory:{counts:{discovered:10,documents:2,selectedDocuments:2,skippedLarge:1,skippedUnsupported:7,skippedEmpty:0}},filesInspected:['docs/a.md','docs/b.md'],warnings:['bounded sample']},
    questions:[
      {id:'ACC-001',area:'accessibility',prompt:'Accessible?',answer:'needs-investigation',reviewState:'unreviewed',evidence:[
        {id:'ACC-001-E1',source:'docs/a.md',snippet:'does not support accessible names',url:'https://github.com/owner/repo/blob/abcd1234/docs/a.md#L1',evidenceType:'repository-document',sourceAuthority:'document-candidate',strength:'candidate-keyword-match',line:1,section:'Accessibility',labels:[],negated:true,normativeHint:false,contradictionHint:true},
        {id:'ACC-001-E2',source:'docs/b.md',snippet:'accessible name guidance',url:'https://github.com/owner/repo/blob/abcd1234/docs/b.md#L2',evidenceType:'repository-document',sourceAuthority:'document-candidate',strength:'candidate-keyword-match',line:2,section:'Guidance',labels:[],negated:false,normativeHint:true,contradictionHint:true}
      ]},
      {id:'PRI-001',area:'privacy',prompt:'Personal data?',answer:'needs-investigation',reviewState:'unreviewed',evidence:[]}
    ]
  };
}

test('No WebMCP is a supported, non-blocking browser state', async()=>{
  globalThis.document={};
  const state=await registerWebMCP(()=>null);
  assert.equal(state.available,false);
  assert.equal(state.toolInfo.length,8);
  assert.deepEqual(state.tools,[]);
  delete globalThis.document;
});

test('Browser WebMCP registers expanded read-only, structured tools',async()=>{
  const tools=[]; const listeners={}; const activity=[];
  globalThis.document={modelContext:{
    async registerTool(tool,options){tools.push({tool,options});},
    addEventListener(type,handler){listeners[type]=handler;},
    removeEventListener(type,handler){if(listeners[type]===handler)delete listeners[type];}
  }};
  const review=fixtureReview();
  const state=await registerWebMCP(()=>review,()=>[{id:'general',title:'General',status:'experimental',kind:'community-starter',version:'0.2.0',defaultAreas:['accessibility']}],{onActivity:message=>activity.push(message)});
  assert.equal(state.available,true);
  assert.equal(tools.length,8);
  assert.deepEqual(tools.map(({tool})=>tool.name),['list_review_packs','get_review_overview','get_question_evidence','list_unresolved_questions','get_repository_inventory','get_questionnaire_provenance','get_counterevidence','prepare_export_preview']);
  assert.ok(tools.every(({tool})=>tool.annotations.readOnlyHint===true));
  assert.ok(tools.every(({tool})=>tool.outputSchema && tool.outputSchema.type==='object'));
  const execute=name=>tools.find(({tool})=>tool.name===name).tool.execute;
  assert.equal((await execute('list_review_packs')({})).packs[0].version,'0.2.0');
  assert.equal((await execute('get_review_overview')({})).evidenceCandidates,2);
  const evidence=await execute('get_question_evidence')({questionId:'ACC-001',maxResults:1});
  assert.equal(evidence.evidence.length,1);
  assert.equal(evidence.omitted,1);
  assert.equal(evidence.evidence[0].negated,true);
  assert.equal(evidence.evidence[0].contradictionHint,true);
  const unresolved=await execute('list_unresolved_questions')({});
  assert.equal(unresolved.questions.length,2);
  assert.equal(unresolved.questions[0].hasNegation,true);
  const inventory=await execute('get_repository_inventory')({});
  assert.equal(inventory.inventory.documents,2);
  assert.equal(inventory.publishedLinks[0].url,'https://example.org/spec');
  const provenance=await execute('get_questionnaire_provenance')({});
  assert.equal(provenance.pack.version,'0.2.0');
  assert.equal(provenance.areas[0].authoritativeSources[0],'https://www.w3.org/WAI/');
  const counter=await execute('get_counterevidence')({questionId:'ACC-001'});
  assert.equal(counter.candidates.length,2);
  const preview=await execute('prepare_export_preview')({});
  assert.equal(preview.unresolvedQuestionIds.length,2);
  listeners.toolactivated({toolName:'get_review_overview'});
  assert.match(activity[0],/get_review_overview/);
  state.cleanup();
  assert.ok(tools.every(({options})=>options.signal.aborted));
  assert.equal(listeners.toolactivated,undefined);
  delete globalThis.document;
});
