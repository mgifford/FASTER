import test from 'node:test';
import assert from 'node:assert/strict';
import {registerWebMCP} from '../src/webmcp.js';

test('No WebMCP is a supported, non-blocking browser state', async()=>{
  globalThis.document={};
  const state=await registerWebMCP(()=>null);
  assert.equal(state.available,false);
  delete globalThis.document;
});

test('Browser WebMCP registers read-only, structured tools and cleanup signal',async()=>{
  const tools=[];
  globalThis.document={modelContext:{async registerTool(tool,options){tools.push({tool,options});}}};
  const review={repository:{url:'https://github.com/owner/repo'},commitSha:'abcd1234',preset:{id:'general'},reviewStatus:'draft',questions:[{id:'ACC-001',area:'accessibility',prompt:'Accessible?',answer:'needs-investigation',reviewState:'unreviewed',evidence:[{id:'ACC-001-E1',source:'README.md',snippet:'Maybe',url:'https://github.com/owner/repo/blob/abcd1234/README.md#L1',evidenceType:'repository-document',strength:'candidate-keyword-match'}]}]};
  const state=await registerWebMCP(()=>review,()=>[{id:'general',title:'General',status:'experimental',kind:'starter'}]);
  assert.equal(state.available,true); assert.equal(tools.length,4);
  assert.ok(tools.every(({tool})=>tool.annotations.readOnlyHint===true));
  assert.equal(tools[0].tool.name,'list_review_packs');
  assert.equal((await tools[0].tool.execute({})).packs[0].id,'general');
  assert.equal((await tools[1].tool.execute({})).questions,1);
  assert.equal((await tools[2].tool.execute({questionId:'ACC-001'})).evidence[0].id,'ACC-001-E1');
  assert.equal((await tools[3].tool.execute({})).questions.length,1);
  state.cleanup();assert.ok(tools.every(x=>x.options.signal.aborted));
  delete globalThis.document;
});
