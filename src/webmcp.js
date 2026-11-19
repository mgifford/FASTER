/**
 * Optional browser WebMCP (draft Community Group API).
 * This is NOT the conventional MCP server transport. WebMCP callbacks return
 * ordinary structured JS values, not a backend MCP `content` envelope.
 */
export async function registerWebMCP(getReview, getPresetRegistry = () => []) {
  const context = document.modelContext;
  if (!context?.registerTool) return { available:false, reason:'WebMCP is not available in this browser.' };
  const controller = new AbortController();
  const tools = [
    {
      name:'list_review_packs', title:'List available review packs',
      description:'Read installed review packs and draft authority status. Does not change any data.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true},
      async execute() {
        return {packs:getPresetRegistry().map(p => ({id:p.id,title:p.title,status:p.status,kind:p.kind}))};
      }
    },
    {
      name:'get_review_overview', title:'Get draft review overview',
      description:'Read current repository, pinned commit, review-pack status and unresolved question counts. Never makes conformance decisions.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      async execute() {
        const r = getReview();
        if (!r) return {state:'empty',message:'No repository has been analyzed yet.'};
        return {state:'draft',repo:r.repository.url,commit:r.commitSha,preset:r.preset,reviewStatus:r.reviewStatus,questions:r.questions.length,unresolved:r.questions.filter(q=>q.answer==='needs-investigation').length,humanReviewed:r.questions.filter(q=>q.reviewState==='human-reviewed').length};
      }
    },
    {
      name:'get_question_evidence', title:'Get evidence for one review question',
      description:'Return an identified question and bounded untrusted source excerpts. Keyword hits are not proof of compliance.',
      inputSchema:{type:'object',properties:{questionId:{type:'string',maxLength:40}},required:['questionId'],additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      async execute({questionId}) {
        const q=getReview()?.questions.find(q=>q.id===questionId);
        if(!q) return {error:'Unknown questionId'};
        return {id:q.id,area:q.area,prompt:q.prompt,answer:q.answer,reviewState:q.reviewState,evidence:q.evidence.slice(0,6).map(e=>({id:e.id,source:e.source,url:e.url,snippet:e.snippet,evidenceType:e.evidenceType,sourceAuthority:e.sourceAuthority,strength:e.strength}))};
      }
    },
    {
      name:'list_unresolved_questions', title:'List unresolved review questions',
      description:'Read unresolved questions, their areas and candidate evidence counts. No automatic conformance determination.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      async execute() {
        const result=(getReview()?.questions || []).filter(q=>q.answer==='needs-investigation').map(q=>({id:q.id,area:q.area,prompt:q.prompt,evidenceCount:q.evidence.length}));
        return {questions:result.slice(0,40),omitted:Math.max(0,result.length-40)};
      }
    }
  ];
  try {
    for(const tool of tools) await context.registerTool(tool,{signal:controller.signal});
    return {available:true,cleanup:()=>controller.abort(),tools:tools.map(t=>t.name)};
  } catch(err) {
    controller.abort();
    return {available:false,reason:`WebMCP registration failed: ${err.message}`};
  }
}
