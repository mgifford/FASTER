/**
 * Optional browser WebMCP (draft Community Group API).
 * This is NOT the conventional MCP server transport. WebMCP callbacks return
 * ordinary structured JS values, not a backend MCP `content` envelope.
 */
export async function registerWebMCP(getReview, getPresetRegistry = () => [], { onActivity } = {}) {
  const context = document.modelContext;
  const tools = [
    {
      name:'list_review_packs', title:'List available review packs',
      description:'Read installed review packs, their versions and draft authority status. Does not change any data.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{packs:{type:'array',items:{type:'object'}}},required:['packs']},
      annotations:{readOnlyHint:true,consequentialHint:false},
      async execute() {
        return {packs:getPresetRegistry().map(p => ({id:p.id,title:p.title,description:p.description,status:p.status,kind:p.kind,version:p.version||'unversioned',defaultAreas:p.defaultAreas||[]}))};
      }
    },
    {
      name:'get_review_overview', title:'Get draft review overview',
      description:'Read the current repository, pinned commit, review-pack status, inventory coverage and question counts. Never makes conformance decisions.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{state:{type:'string'},repo:{type:'string'},commit:{type:'string'},preset:{type:'object'},questions:{type:'integer'},unresolved:{type:'integer'},humanReviewed:{type:'integer'},evidenceCandidates:{type:'integer'},inventory:{type:'object'}},required:['state']},
      annotations:{readOnlyHint:true,untrustedContentHint:true,consequentialHint:false},
      async execute() {
        const review = getReview();
        if (!review) return {state:'empty',message:'No repository has been analyzed yet.'};
        const evidence = review.questions.reduce((sum, question) => sum + question.evidence.length, 0);
        return {
          state:'draft', repo:review.repository.url, commit:review.commitSha, retrievedAt:review.retrievedAt,
          preset:review.preset, reviewStatus:review.reviewStatus,
          questions:review.questions.length,
          unresolved:review.questions.filter(question => question.answer === 'needs-investigation').length,
          humanReviewed:review.questions.filter(question => question.reviewState === 'human-reviewed').length,
          evidenceCandidates:evidence,
          inventory:review.scope?.inventory?.counts || null,
          publishedLinks:(review.publishedLinks || []).length
        };
      }
    },
    {
      name:'get_question_evidence', title:'Get evidence for one review question',
      description:'Return an identified question and bounded untrusted source excerpts, including section, negation, normative and conflict hints. Keyword hits are not proof of compliance.',
      inputSchema:{type:'object',properties:{questionId:{type:'string',maxLength:40},maxResults:{type:'integer',minimum:1,maximum:6}},required:['questionId'],additionalProperties:false},
      outputSchema:{type:'object',properties:{id:{type:'string'},area:{type:'string'},prompt:{type:'string'},answer:{type:'string'},reviewState:{type:'string'},evidence:{type:'array',items:{type:'object'}},omitted:{type:'integer'}},required:['id','evidence']},
      annotations:{readOnlyHint:true,untrustedContentHint:true,consequentialHint:false},
      async execute({questionId, maxResults} = {}) {
        const question = getReview()?.questions.find(item => item.id === questionId);
        if (!question) return {error:'Unknown questionId'};
        const limit = Math.min(Math.max(Number(maxResults) || 6, 1), 6);
        return {
          id:question.id, area:question.area, prompt:question.prompt, answer:question.answer, reviewState:question.reviewState,
          evidence:question.evidence.slice(0, limit).map(evidence => ({
            id:evidence.id, source:evidence.source, url:evidence.url, snippet:evidence.snippet,
            evidenceType:evidence.evidenceType, sourceAuthority:evidence.sourceAuthority, strength:evidence.strength,
            line:evidence.line, section:evidence.section || null, labels:evidence.labels || [],
            negated:Boolean(evidence.negated), normativeHint:Boolean(evidence.normativeHint),
            contradictionHint:Boolean(evidence.contradictionHint), merged:evidence.merged ?? null,
            duplicateSources:evidence.duplicateSources?.length || 0
          })),
          omitted:Math.max(0, question.evidence.length - limit)
        };
      }
    },
    {
      name:'list_unresolved_questions', title:'List unresolved review questions',
      description:'Read unresolved questions with evidence counts and possible-negation/conflict hints. No automatic conformance determination.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{questions:{type:'array',items:{type:'object'}},omitted:{type:'integer'}},required:['questions']},
      annotations:{readOnlyHint:true,untrustedContentHint:true,consequentialHint:false},
      async execute() {
        const result = (getReview()?.questions || [])
          .filter(question => question.answer === 'needs-investigation')
          .map(question => ({
            id:question.id, area:question.area, prompt:question.prompt, evidenceCount:question.evidence.length,
            hasNegation:question.evidence.some(evidence => evidence.negated),
            hasContradictionHint:question.evidence.some(evidence => evidence.contradictionHint)
          }));
        return {questions:result.slice(0, 40), omitted:Math.max(0, result.length - 40)};
      }
    },
    {
      name:'get_repository_inventory', title:'Get repository inventory and coverage',
      description:'Read the pinned repository metadata, selected/skipped document counts, inspected files and candidate published links. No file contents.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{state:{type:'string'},repo:{type:'string'},commit:{type:'string'},scopePath:{type:'string'},inventory:{type:'object'},filesInspected:{type:'array'},publishedLinks:{type:'array'}},required:['state']},
      annotations:{readOnlyHint:true,consequentialHint:false},
      async execute() {
        const review = getReview();
        if (!review) return {state:'empty',message:'No repository has been analyzed yet.'};
        return {
          state:'draft', repo:review.repository.url, commit:review.commitSha,
          scopePath:review.context?.scopePath || null,
          inventory:review.scope?.inventory?.counts || null,
          filesInspected:(review.scope?.filesInspected || []).slice(0, 50),
          publishedLinks:(review.publishedLinks || []).slice(0, 10).map(link => ({url:link.url,label:link.label,source:link.source,line:link.line}))
        };
      }
    },
    {
      name:'get_questionnaire_provenance', title:'Get review-pack provenance',
      description:'Read the review pack ID, version, authority status, areas and authoritative source links. No question text is treated as official.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{state:{type:'string'},pack:{type:'object'},questionCount:{type:'integer'},areas:{type:'array'}},required:['state']},
      annotations:{readOnlyHint:true,consequentialHint:false},
      async execute() {
        const review = getReview();
        if (!review) return {state:'empty',message:'No repository has been analyzed yet.'};
        return {
          state:'draft', pack:review.preset, questionCount:review.questions.length,
          areas:(review.questionnaireSources || []).map(area => ({id:area.id,title:area.title,classification:area.classification,formalW3CHorizontalArea:area.formalW3CHorizontalArea ?? null,authoritativeSources:(area.authoritativeSources || []).slice(0, 6)}))
        };
      }
    },
    {
      name:'get_counterevidence', title:'Get flagged counterevidence candidates',
      description:'Read evidence flagged as possible negation or conflicting candidates for one question or the whole review. These are candidates, not conclusions.',
      inputSchema:{type:'object',properties:{questionId:{type:'string',maxLength:40}},additionalProperties:false},
      outputSchema:{type:'object',properties:{candidates:{type:'array',items:{type:'object'}},omitted:{type:'integer'},caveat:{type:'string'}},required:['candidates']},
      annotations:{readOnlyHint:true,untrustedContentHint:true,consequentialHint:false},
      async execute({questionId} = {}) {
        const review = getReview();
        if (!review) return {candidates:[], omitted:0, caveat:'No review has been analyzed yet.'};
        const questions = review.questions.filter(question => !questionId || question.id === questionId);
        const candidates = questions.flatMap(question => question.evidence
          .filter(evidence => evidence.negated || evidence.contradictionHint)
          .map(evidence => ({
            questionId:question.id, evidenceId:evidence.id, source:evidence.source, url:evidence.url,
            snippet:evidence.snippet, section:evidence.section || null, negated:Boolean(evidence.negated),
            contradictionHint:Boolean(evidence.contradictionHint), merged:evidence.merged ?? null
          })));
        return {candidates:candidates.slice(0, 20), omitted:Math.max(0, candidates.length - 20), caveat:'Flagged candidates only; a human must decide whether they conflict or matter.'};
      }
    },
    {
      name:'prepare_export_preview', title:'Preview the draft review export',
      description:'Read a bounded summary of the current draft review and its unresolved IDs. Does not create, download or publish anything.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      outputSchema:{type:'object',properties:{state:{type:'string'},schemaVersion:{type:'string'},repository:{type:'string'},commitSha:{type:'string'},preset:{type:'object'},counts:{type:'object'},unresolvedQuestionIds:{type:'array'},warnings:{type:'array'},publishedLinks:{type:'array'}},required:['state']},
      annotations:{readOnlyHint:true,consequentialHint:false},
      async execute() {
        const review = getReview();
        if (!review) return {state:'empty',message:'No repository has been analyzed yet.'};
        return {
          state:'draft', schemaVersion:review.schemaVersion, repository:review.repository.url, commitSha:review.commitSha, retrievedAt:review.retrievedAt,
          preset:review.preset,
          counts:{questions:review.questions.length,evidenceCandidates:review.questions.reduce((sum, question) => sum + question.evidence.length, 0),humanReviewed:review.questions.filter(question => question.reviewState === 'human-reviewed').length,unresolved:review.questions.filter(question => question.answer === 'needs-investigation').length},
          unresolvedQuestionIds:review.questions.filter(question => question.answer === 'needs-investigation').map(question => question.id).slice(0, 100),
          warnings:(review.scope?.warnings || []).slice(0, 10),
          publishedLinks:(review.publishedLinks || []).slice(0, 10).map(link => link.url)
        };
      }
    }
  ];
  const toolInfo = tools.map(tool => ({name:tool.name, title:tool.title, description:tool.description}));
  if (!context?.registerTool) return {available:false, reason:'WebMCP is not available in this browser.', tools:[], toolInfo};
  const controller = new AbortController();
  const activity = message => { try { onActivity?.(message); } catch {} };
  const activated = event => activity(`Browser agent activated ${event?.toolName || 'a read-only tool'}.`);
  const changed = () => activity('Browser WebMCP tool registry changed.');
  if (typeof context.addEventListener === 'function') {
    context.addEventListener('toolactivated', activated);
    context.addEventListener('toolchange', changed);
  }
  try {
    for (const tool of tools) await context.registerTool(tool, {signal:controller.signal});
    return {
      available:true, tools:tools.map(tool => tool.name), toolInfo,
      cleanup:() => {
        controller.abort();
        if (typeof context.removeEventListener === 'function') {
          context.removeEventListener('toolactivated', activated);
          context.removeEventListener('toolchange', changed);
        }
      }
    };
  } catch (err) {
    controller.abort();
    if (typeof context.removeEventListener === 'function') {
      context.removeEventListener('toolactivated', activated);
      context.removeEventListener('toolchange', changed);
    }
    return {available:false, reason:`WebMCP registration failed: ${err.message}`, tools:[], toolInfo};
  }
}
