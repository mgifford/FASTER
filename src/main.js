import { inspectRepository } from './github.js';
import { findEvidence, newReview, applyReviewerDecision, validateAIProposals, toMarkdown, toAIPrompt } from './review-core.js';
import { registerWebMCP } from './webmcp.js';

const $ = id => document.getElementById(id);
let review = null;
let controller = null;
let currentConfig = null;
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined && text !== null) el.textContent = String(text);
  if (className) el.className = className;
  return el;
};

function makeLink(url, text) {
  const link = node('a', text);
  // Only permit known HTTPS source links; no HTML from repositories is ever rendered.
  try { const u=new URL(url); if (u.protocol !== 'https:') throw Error(); link.href=u.href; link.target='_blank'; link.rel='noopener noreferrer'; }
  catch { link.textContent=`${text} (invalid link)`; }
  return link;
}
function updateMessage(text) { $('progress').textContent=text; }
function blobDownload(filename, text, type='text/plain') {
  const blob = new Blob([text], {type:`${type};charset=utf-8`});
  const url=URL.createObjectURL(blob); const a=node('a'); a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function fileBase() { return `${review.repository.owner}-${review.repository.repo}-${review.commitSha.slice(0,8)}-horizontal-review`; }
function setBusy(busy) { $('scan-button').disabled=busy;$('cancel-button').disabled=!busy; }
function statusLabel(s) { return ({'needs-investigation':'Needs investigation','met':'Met','not-met':'Not met','not-applicable':'Not applicable'})[s] || s; }

let presetRegistry = [];

async function loadPreset(presetId) {
  const preset = presetRegistry.find(p => p.id === presetId);
  if (!preset) throw new Error('Unknown review pack.');
  const [sources, questions, rules] = await Promise.all(
    [preset.sources, preset.questions, preset.rules].map(path => fetch(path).then(r => {
      if (!r.ok) throw new Error(`Cannot load ${path}`);
      return r.json();
    }))
  );
  currentConfig = {preset, sources, questions, rules};
  $('areas').replaceChildren();
  for (const area of sources.reviewAreas) {
    const label=node('label',null,'checkline');
    const input=node('input'); input.type='checkbox'; input.value=area.id;
    input.checked=preset.defaultAreas.includes(area.id); input.name='review-area';
    label.append(input,node('span',area.title)); $('areas').append(label);
  }
  $('preset-help').textContent=`${preset.description} Pack status: ${preset.status}.`;
}

async function init() {
  try {
    const registry = await fetch('data/presets.json').then(r => {
      if(!r.ok) throw Error('Cannot load review pack registry');
      return r.json();
    });
    presetRegistry=registry.presets;
    for(const preset of presetRegistry){
      const opt=node('option',preset.title); opt.value=preset.id;
      $('preset').append(opt);
    }
    $('preset').value='general';
    await loadPreset('general');
    $('preset').addEventListener('change',async()=>{
      $('scan-button').disabled=true;
      try {await loadPreset($('preset').value);updateMessage('Review pack changed. Run analysis to use it. Existing review remains unchanged.');}
      catch(err){updateMessage(`Could not load review pack: ${err.message}`);}
      finally{$('scan-button').disabled=false;}
    });
    const mcp = await registerWebMCP(()=>review,()=>presetRegistry);
    $('webmcp-status').textContent=mcp.available ? `Optional WebMCP tools registered: ${mcp.tools.join(', ')}` : `WebMCP unavailable: ${mcp.reason} The site remains fully functional.`;
  } catch(err) { updateMessage(`Configuration failure: ${err.message}. Serve this directory over HTTP, not file://.`); return; }
  $('intake-form').addEventListener('submit', startAnalysis);
  $('cancel-button').addEventListener('click',()=>controller?.abort());
  for(const id of ['area-filter','status-filter','question-filter']) $(id).addEventListener('input',renderQuestions);
  $('download-json').addEventListener('click',()=>review&&blobDownload(`${fileBase()}.json`,JSON.stringify(review,null,2),'application/json'));
  $('download-md').addEventListener('click',()=>review&&blobDownload(`${fileBase()}.md`,toMarkdown(review)));
  $('copy-ai').addEventListener('click',async()=>{
    if(!review)return;
    try {await navigator.clipboard.writeText(toAIPrompt(review));$('ai-message').textContent='AI prompt copied.';}
    catch{$('ai-message').textContent='Clipboard unavailable. Use the Download AI evidence prompt button.';}
  });
  $('download-ai').addEventListener('click',()=>review&&blobDownload(`${fileBase()}-ai-prompt.txt`,toAIPrompt(review)));
  $('import-ai').addEventListener('click',importAISuggestions);
  $('load-review').addEventListener('change',loadSavedReview);
}

async function startAnalysis(ev) {
  ev.preventDefault();
  if(!currentConfig)return;
  const areas=[...document.querySelectorAll('input[name="review-area"]:checked')].map(x=>x.value);
  if(!areas.length){updateMessage('Select at least one review area.');return;}
  controller = new AbortController();setBusy(true);
  try {
    const targetType=$('target-type').value;
    const reviewPurpose=$('review-purpose').value.trim();
    const requestedDocument=$('document-path').value.trim();
    const snapshot=await inspectRepository($('repository').value,$('ref').value,{includeCode:$('include-code').checked,preferredDocumentPath:requestedDocument,signal:controller.signal,onProgress:updateMessage});
    const relevant=currentConfig.questions.questions.filter(q=>areas.includes(q.area));
    const evidence=findEvidence({files:snapshot.files,issues:snapshot.issues,rules:currentConfig.rules.rules,questions:relevant,repoUrl:snapshot.repo.url,sha:snapshot.sha});
    review=newReview({repo:snapshot.repo,sha:snapshot.sha,selectedAreas:areas,questions:relevant,evidence,sourceConfig:currentConfig.sources,fileSummary:snapshot.files.map(f=>f.path),issueSummary:snapshot.issues.map(i=>`${i.kind} #${i.number} (${i.state || 'unknown'})`),warnings:snapshot.warnings,preset:currentConfig.preset,context:{targetType,reviewPurpose,requestedDocument}});
    showReview();
    updateMessage(`Analyzed ${snapshot.files.length} source files and ${snapshot.issues.length} issue/PR discussions. No conformance findings were made automatically.`);
  } catch (err) {updateMessage(err.name==='AbortError'?'Analysis cancelled.':`Analysis failed: ${err.message}`);}
  finally {setBusy(false);controller=null;}
}

function showReview() {
  if(!review)return;
  $('results').hidden=false;
  $('repo-summary').replaceChildren(makeLink(review.repository.url,review.repository.url));
  $('snapshot-label').textContent=`Review pack: ${review.preset?.title || 'Legacy starter'}. Target: ${review.context?.targetType || 'unspecified'}. Pinned commit: ${review.commitSha}. Generated: ${review.generatedAt}. Status: draft, not a conformance determination.`;
  $('area-filter').replaceChildren(node('option','All selected areas'));
  $('area-filter').firstChild.value='all';
  for(const area of review.questionnaireSources){const opt=node('option',area.title);opt.value=area.id;$('area-filter').append(opt);}
  $('status-filter').value='all';$('question-filter').value='';
  $('limitations').replaceChildren(...(review.scope?.warnings || []).map(w=>node('li',w)));
  updateCounts();renderQuestions();
}

function updateCounts() {
  if(!review)return;
  const stats=[
    ['Questions',review.questions.length],
    ['Evidence candidates',review.questions.reduce((n,q)=>n+q.evidence.length,0)],
    ['Human reviewed',review.questions.filter(q=>q.reviewState==='human-reviewed').length],
    ['Unresolved',review.questions.filter(q=>q.answer==='needs-investigation').length]
  ];
  $('counts').replaceChildren(...stats.map(([label,n])=>{const box=node('div',null,'stat');box.append(node('strong',n),node('span',label));return box;}));
}

function renderQuestions() {
  if(!review)return;
  const area=$('area-filter').value,status=$('status-filter').value,needle=$('question-filter').value.toLowerCase().trim();
  const filtered=review.questions.filter(q=>(area==='all'||q.area===area)&&(status==='all'||q.answer===status)&&(`${q.id} ${q.prompt} ${q.area}`).toLowerCase().includes(needle));
  $('questions').replaceChildren();
  if(!filtered.length){$('questions').append(node('p','No questions match this filter.'));return;}
  for(const q of filtered) $('questions').append(renderQuestion(q));
}

function renderQuestion(q) {
  const article=node('article',null,'question');article.id=`question-${q.id}`;
  const top=node('div',null,'question-top');top.append(node('span',`${q.id} | ${q.area}`,'meta'),node('span',q.reviewState==='human-reviewed'?'Human reviewed':'Not yet reviewed','badge-text'));
  article.append(top,node('h3',q.prompt),node('p',q.why,'help'));
  const details=node('details');const summary=node('summary',`Evidence candidates (${q.evidence.length})`);details.append(summary);
  if(!q.evidence.length)details.append(node('p','No matching evidence in sampled files or issues. This is not proof of absence.','help'));
  else {
    const list=node('ol',null,'evidence');
    for(const ev of q.evidence){
      const li=node('li');li.append(makeLink(ev.url,`${ev.id}: ${ev.source}${ev.line?` line ${ev.line}`:''}`),node('p',ev.snippet,'snippet'),node('span',`${ev.evidenceType}; ${ev.sourceAuthority || 'unclassified'}; ${ev.strength}; matched: ${ev.matchedTerms.join(', ')}`,'meta'));list.append(li);
    }
    details.append(list);
  }
  article.append(details);
  if(q.aiProposal){
    const proposal=node('section',null,'ai-proposal');proposal.append(node('strong',`Unapproved AI suggestion: ${statusLabel(q.aiProposal.suggestedAnswer)}`),node('p',q.aiProposal.explanation),node('p',`Cites: ${q.aiProposal.evidenceIds.join(', ') || 'none'}`,'meta'));
    const approve=node('button','Apply suggestion as human decision','secondary');approve.type='button';approve.addEventListener('click',()=>{
      const answer=q.aiProposal.suggestedAnswer;const why=`Reviewer accepted AI proposal: ${q.aiProposal.explanation}`;
      replaceQuestion(q.id,applyReviewerDecision(q,answer,why));
    });proposal.append(approve);article.append(proposal);
  }
  const edit=node('div',null,'review-inputs');
  const selHolder=node('div');const label=node('label','Review answer');const select=node('select');label.htmlFor=`answer-${q.id}`;select.id=label.htmlFor;
  for(const value of ['needs-investigation','met','not-met','not-applicable']){const option=node('option',statusLabel(value));option.value=value;select.append(option);}select.value=q.answer;
  select.addEventListener('change',()=>replaceQuestion(q.id,applyReviewerDecision(q,select.value,q.reviewerRationale)));
  selHolder.append(label,select);
  const whyHolder=node('div');const rationaleLabel=node('label','Reviewer rationale / outstanding question');const rationale=node('textarea');rationale.id=`why-${q.id}`;rationale.rows=3;rationale.value=q.reviewerRationale;rationaleLabel.htmlFor=rationale.id;rationale.addEventListener('change',()=>replaceQuestion(q.id,applyReviewerDecision(q,q.answer,rationale.value)));whyHolder.append(rationaleLabel,rationale);
  edit.append(selHolder,whyHolder);article.append(edit);
  return article;
}
function replaceQuestion(id,next){review.questions=review.questions.map(q=>q.id===id?next:q);updateCounts();renderQuestions();}
function importAISuggestions(){
  try {
    if(!review)throw Error('Analyze a repository first.');
    const text=$('ai-json').value;
    if(text.length>150000)throw Error('AI proposal input exceeds 150 KB.');
    const proposals=validateAIProposals(JSON.parse(text),review);
    const byId=new Map(proposals.map(p=>[p.questionId,p]));
    review.questions=review.questions.map(q=>byId.has(q.id)?{...q,aiProposal:byId.get(q.id)}:q);
    renderQuestions();$('ai-message').textContent=`Imported ${proposals.length} unapproved suggestions. Nothing was marked reviewed.`;
  }catch(err){$('ai-message').textContent=`Import rejected: ${err.message}`;}
}
async function loadSavedReview(ev){
  try{
    const file=ev.target.files?.[0];if(!file)return;if(file.size>2500000)throw Error('File too large (maximum 2.5 MB).');
    const candidate=JSON.parse(await file.text());
    if(!['0.1.0','0.2.0'].includes(candidate.schemaVersion)||!Array.isArray(candidate.questions)||!Array.isArray(candidate.selectedAreas)||!candidate.repository?.url||!candidate.commitSha||!candidate.scope?.warnings||!candidate.questionnaireSources)throw Error('Unsupported review data format.');
    if(candidate.questions.length>1000)throw Error('Unreasonable number of questions.');
    review=candidate;showReview();updateMessage('Saved review opened locally; no network request made.');
  }catch(err){updateMessage(`Could not open review: ${err.message}`);}finally{ev.target.value='';}
}
init();
