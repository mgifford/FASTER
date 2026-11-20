import { discoverRepository, fetchRepositorySources } from './github.js';
import { findEvidence, hasReviewableDocuments, newReview, applyReviewerDecision, validateAIProposals, toMarkdown, toAIPrompt } from './review-core.js';
import { registerWebMCP } from './webmcp.js';

const $ = id => document.getElementById(id);
let review = null;
let controller = null;
let currentConfig = null;
let discovery = null;
let selectedDocuments = new Set();
let isBusy = false;
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
function setBusy(busy) {
  isBusy=busy;
  $('scan-button').disabled=busy;
  $('cancel-button').disabled=!busy;
  const analyze=$('analyze-selected'); if(analyze) analyze.disabled=busy||!selectedDocuments.size;
  const cancelSelected=$('cancel-selected'); if(cancelSelected) cancelSelected.disabled=!busy;
}
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
  $('preset-help').textContent=`${preset.description} Pack status: ${preset.status}. Version: ${preset.version || 'unversioned'}.`;
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
      if(isBusy){$('preset').value=currentConfig.preset.id;updateMessage('Wait for the current request to finish before changing review packs.');return;}
      $('scan-button').disabled=true;
      try {await loadPreset($('preset').value);updateMessage(discovery?'Review pack changed. The inventory remains valid; analysis will use the new pack.':'Review pack changed. Discover a repository to use it.');}
      catch(err){updateMessage(`Could not load review pack: ${err.message}`);}
      finally{if(!isBusy)$('scan-button').disabled=false;}
    });
    const mcp = await registerWebMCP(()=>review,()=>presetRegistry);
    $('webmcp-status').textContent=mcp.available ? `Optional WebMCP tools registered: ${mcp.tools.join(', ')}` : `WebMCP unavailable: ${mcp.reason} The site remains fully functional.`;
  } catch(err) { updateMessage(`Configuration failure: ${err.message}. Serve this directory over HTTP, not file://.`); return; }
  $('intake-form').addEventListener('submit', startDiscovery);
  $('cancel-button').addEventListener('click',()=>controller?.abort());
  $('cancel-selected').addEventListener('click',()=>controller?.abort());
  $('analyze-selected').addEventListener('click', analyzeSelected);
  $('use-type').addEventListener('click',()=>{
    if(!discovery?.suggestion)return;
    $('target-type').value=discovery.suggestion.type;
    $('use-type').hidden=true;
    $('inventory-status').textContent=`Applied suggested type "${discovery.suggestion.type}". Confirm or change it before analyzing.`;
    $('target-type').focus();
  });
  $('include-code').addEventListener('change',()=>{if(discovery)renderInventory(discovery);});
  $('target-type').addEventListener('change',()=>{if(discovery) $('use-type').hidden=!discovery.suggestion || discovery.suggestion.type==='other' || discovery.suggestion.type===$('target-type').value;});
  for(const id of ['area-filter','status-filter','question-filter']) $(id).addEventListener('input',renderQuestions);
  for(const id of ['repository','ref']) $(id).addEventListener('input',()=>{
    if(!discovery)return;
    discovery=null;selectedDocuments.clear();review=null;
    $('inventory').hidden=true;$('results').hidden=true;updateAnalyzeButton();
    updateMessage('Repository or ref changed. Discover again.');
  });
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

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateAnalyzeButton() {
  const button = $('analyze-selected');
  if (!button) return;
  button.disabled = isBusy || !selectedDocuments.size;
  const help = $('document-help');
  const total = discovery?.inventory.counts.documents || 0;
  if (help) help.textContent = `Select up to 16 documents to search. ${selectedDocuments.size} selected.${total > 100 ? ` Showing the top 100 of ${total} candidates.` : ''}`;
}

function updateCoverage() {
  if (!discovery) return;
  const counts = discovery.inventory.counts;
  const code = $('include-code').checked ? discovery.inventory.defaultCodePaths.length : 0;
  const stats = [
    ['Discovered files', counts.discovered],
    ['Documents', counts.documents],
    ['Selected', selectedDocuments.size],
    ['Code sample', code],
    ['Skipped', counts.skippedLarge + counts.skippedUnsupported + counts.skippedEmpty]
  ];
  $('coverage').replaceChildren(...stats.map(([label, value]) => {
    const box = node('div', null, 'stat');
    box.append(node('strong', value), node('span', label));
    return box;
  }));
}

function renderInventory(result, focus = false) {
  discovery = result;
  $('inventory').hidden = false;
  const repo = result.repo;
  const meta = [];
  if (repo.description) meta.push(repo.description);
  meta.push(`Default branch: ${repo.defaultBranch}`);
  meta.push(`Commit: ${result.sha}`);
  meta.push(`License: ${repo.license || 'not detected'}`);
  if (repo.language) meta.push(`Language: ${repo.language}`);
  if (repo.topics?.length) meta.push(`Topics: ${repo.topics.join(', ')}`);
  if (repo.archived) meta.push('Archived repository');
  if (result.rateLimit) meta.push(`GitHub API remaining: ${result.rateLimit.remaining}/${result.rateLimit.limit}`);
  $('repo-meta').textContent = meta.join(' · ');

  const suggestion = result.suggestion;
  $('type-suggestion').textContent = suggestion ? `Suggested project type: ${suggestion.type} (not confirmed). ${suggestion.reasons.join('; ')}.` : '';
  $('use-type').hidden = !suggestion || suggestion.type === 'other' || suggestion.type === $('target-type').value;
  $('use-type').dataset.type = suggestion?.type || '';

  const list = $('document-list');
  list.replaceChildren();
  for (const doc of result.inventory.documents) {
    const label = node('label', null, 'checkline inventory-item');
    const input = node('input');
    input.type = 'checkbox'; input.value = doc.path; input.checked = selectedDocuments.has(doc.path);
    input.addEventListener('change', () => {
      if (input.checked && selectedDocuments.size >= 16) {
        input.checked = false;
        $('inventory-status').textContent = 'Select at most 16 documents.';
        return;
      }
      if (input.checked) selectedDocuments.add(doc.path); else selectedDocuments.delete(doc.path);
      updateCoverage(); updateAnalyzeButton();
    });
    label.append(input, node('span', `${doc.path} (${formatBytes(doc.size)}; ${doc.reason})`));
    list.append(label);
  }
  if (!result.inventory.documents.length) {
    list.append(node('p', 'No reviewable documents were found. Add a priority document path and discover again.', 'help'));
  }

  const code = result.inventory.code;
  $('code-options').hidden = !code.length || !$('include-code').checked;
  $('code-help').textContent = code.length ? `Up to ${Math.min(4, code.length)} code files will be included automatically: ${code.slice(0, 4).map(file => file.path).join(', ')}.` : '';

  const counts = result.inventory.counts;
  const skipped = [];
  if (counts.skippedLarge) skipped.push(`${counts.skippedLarge} file(s) over 140 KB were not indexed.`);
  if (counts.skippedUnsupported) skipped.push(`${counts.skippedUnsupported} unsupported file type(s) were ignored.`);
  if (counts.skippedEmpty) skipped.push(`${counts.skippedEmpty} empty file(s) were ignored.`);
  if (result.inventory.skippedLarge.length) skipped.push(`Examples of oversized files: ${result.inventory.skippedLarge.join(', ')}.`);
  skipped.push(...result.warnings);
  $('skipped-list').replaceChildren(...skipped.map(text => node('li', text)));
  $('skipped-details').hidden = !skipped.length;

  $('inventory-status').textContent = result.inventory.documents.length
    ? 'Select up to 16 documents, then analyze. No conformance finding is made automatically.'
    : 'No reviewable documents were found. Add a priority document path and discover again.';
  updateCoverage(); updateAnalyzeButton();
  if (focus) $('inventory-heading').focus();
}

async function startDiscovery(ev) {
  ev.preventDefault();
  if (!currentConfig || isBusy) return;
  const areas = [...document.querySelectorAll('input[name="review-area"]:checked')].map(input => input.value);
  if (!areas.length) { updateMessage('Select at least one review area.'); return; }
  discovery = null; selectedDocuments.clear(); review = null;
  $('inventory').hidden = true; $('results').hidden = true; updateAnalyzeButton();
  controller = new AbortController(); setBusy(true);
  try {
    const requestedDocument = $('document-path').value.trim();
    const result = await discoverRepository($('repository').value, $('ref').value, {
      includeCode: $('include-code').checked,
      preferredDocumentPath: requestedDocument,
      signal: controller.signal,
      onProgress: updateMessage
    });
    selectedDocuments = new Set(result.inventory.defaultDocumentPaths);
    review = null;
    $('results').hidden = true;
    renderInventory(result, true);
    updateMessage(result.inventory.documents.length ? `Discovered ${result.inventory.counts.documents} document candidate(s) and ${result.inventory.counts.code} code file(s) at ${result.sha}. Select targets, then analyze.` : 'No reviewable documents were found. Add a priority document path and discover again.');
  } catch (err) {
    updateMessage(err.name === 'AbortError' ? 'Discovery cancelled.' : `Discovery failed: ${err.message}`);
  } finally { setBusy(false); controller = null; }
}

async function analyzeSelected() {
  if (!currentConfig || !discovery || isBusy) return;
  if (!selectedDocuments.size) { updateMessage('Select at least one document.'); return; }
  const areas = [...document.querySelectorAll('input[name="review-area"]:checked')].map(input => input.value);
  if (!areas.length) { updateMessage('Select at least one review area.'); return; }
  const paths = [...selectedDocuments];
  if ($('include-code').checked) paths.push(...discovery.inventory.defaultCodePaths);
  const uniquePaths = [...new Set(paths)].slice(0, 20);
  controller = new AbortController(); setBusy(true);
  try {
    const sources = await fetchRepositorySources({
      repo: discovery.repo, sha: discovery.sha, tree: discovery.tree, paths: uniquePaths,
      signal: controller.signal, onProgress: updateMessage
    });
    if (!hasReviewableDocuments(sources.files)) {
      updateMessage('The selected sources contained no reviewable documents. Select another document and try again.');
      return;
    }
    const relevant = currentConfig.questions.questions.filter(question => areas.includes(question.area));
    const evidence = findEvidence({files:sources.files, issues:sources.issues, rules:currentConfig.rules.rules, questions:relevant, repoUrl:discovery.repo.url, sha:discovery.sha, retrievedAt:sources.retrievedAt});
    const inventory = {...discovery.inventory.counts, selectedDocuments:selectedDocuments.size, selectedCode:$('include-code').checked ? discovery.inventory.defaultCodePaths.length : 0, selectedPaths:uniquePaths};
    review = newReview({
      repo: discovery.repo, sha: discovery.sha, selectedAreas: areas, questions: relevant, evidence,
      sourceConfig: currentConfig.sources, fileSummary: sources.files.map(file => file.path),
      issueSummary: sources.issues.map(issue => `${issue.kind === 'pull-request-discussion' ? 'PR' : 'Issue'} #${issue.number} (${issue.kind === 'pull-request-discussion' ? (issue.merged ? 'merged' : issue.state || 'unknown') : (issue.state || 'unknown')})`),
      warnings: [...discovery.warnings, ...sources.warnings], preset: currentConfig.preset,
      context: {targetType: $('target-type').value, reviewPurpose: $('review-purpose').value.trim(), requestedDocument: $('document-path').value.trim()},
      retrievedAt: sources.retrievedAt, inventory
    });
    $('inventory-status').textContent='Analysis complete for the selected documents. Review the evidence below.';
    showReview();
    updateMessage(`Analyzed ${sources.files.length} source files and ${sources.issues.length} issue/PR discussions. No conformance findings were made automatically.`);
  } catch (err) {
    updateMessage(err.name === 'AbortError' ? 'Analysis cancelled.' : `Analysis failed: ${err.message}`);
  } finally { setBusy(false); controller = null; }
}

function showReview() {
  if(!review)return;
  $('results').hidden=false;
  $('repo-summary').replaceChildren(makeLink(review.repository.url,review.repository.url));
  const packVersion=review.preset?.version&&review.preset.version!=='unversioned'?` (v${review.preset.version})`:'';
  $('snapshot-label').textContent=`Review pack: ${review.preset?.title || 'Legacy starter'}${packVersion}. Target: ${review.context?.targetType || 'unspecified'}. Pinned commit: ${review.commitSha}. Generated: ${review.generatedAt}. Status: draft, not a conformance determination.`;
  $('area-filter').replaceChildren(node('option','All selected areas'));
  $('area-filter').firstChild.value='all';
  for(const area of review.questionnaireSources){const opt=node('option',area.title);opt.value=area.id;$('area-filter').append(opt);}
  $('status-filter').value='all';$('question-filter').value='';
  $('ai-json').value='';$('ai-message').textContent='';
  $('limitations').replaceChildren(...(review.scope?.warnings || []).map(w=>node('li',w)));
  updateCounts();renderQuestions();
  $('results-heading').focus();
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
      const current=review.questions.find(x=>x.id===q.id)||q;
      const answer=q.aiProposal.suggestedAnswer;const why=`Reviewer accepted AI proposal: ${q.aiProposal.explanation}`;
      const next={...applyReviewerDecision(current,answer,why),aiProposal:null};
      review.questions=review.questions.map(x=>x.id===q.id?next:x);
      updateCounts();updateQuestionCard(next);proposal.remove();
      $('ai-message').textContent='Suggestion applied as a human decision; the rationale records the AI origin.';
      document.getElementById(`answer-${q.id}`)?.focus();
    });proposal.append(approve);article.append(proposal);
  }
  const edit=node('div',null,'review-inputs');
  const selHolder=node('div');const label=node('label','Review answer');const select=node('select');label.htmlFor=`answer-${q.id}`;select.id=label.htmlFor;
  for(const value of ['needs-investigation','met','not-met','not-applicable']){const option=node('option',statusLabel(value));option.value=value;select.append(option);}select.value=q.answer;
  select.addEventListener('change',()=>{const current=review.questions.find(x=>x.id===q.id)||q;replaceQuestion(q.id,applyReviewerDecision(current,select.value,current.reviewerRationale));});
  selHolder.append(label,select);
  const whyHolder=node('div');const rationaleLabel=node('label','Reviewer rationale / outstanding question');const rationale=node('textarea');rationale.id=`why-${q.id}`;rationale.rows=3;rationale.value=q.reviewerRationale;rationaleLabel.htmlFor=rationale.id;rationale.addEventListener('change',()=>{const current=review.questions.find(x=>x.id===q.id)||q;replaceQuestion(q.id,applyReviewerDecision(current,current.answer,rationale.value));});whyHolder.append(rationaleLabel,rationale);
  edit.append(selHolder,whyHolder);article.append(edit);
  return article;
}
function updateQuestionCard(q){
  const article=document.getElementById(`question-${q.id}`);
  if(!article)return;
  const badge=article.querySelector('.badge-text');
  if(badge)badge.textContent=q.reviewState==='human-reviewed'?'Human reviewed':'Not yet reviewed';
  const select=document.getElementById(`answer-${q.id}`);
  if(select)select.value=q.answer;
  const rationale=document.getElementById(`why-${q.id}`);
  if(rationale&&document.activeElement!==rationale)rationale.value=q.reviewerRationale;
}
function replaceQuestion(id,next){
  review.questions=review.questions.map(q=>q.id===id?next:q);
  updateCounts();updateQuestionCard(next);
  const status=$('status-filter').value;
  if(status!=='all'&&next.answer!==status){
    const activeId=document.activeElement?.id;
    renderQuestions();
    const target=activeId?document.getElementById(activeId):null;
    (target||$('status-filter')).focus();
  }
}
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
    discovery=null;$('inventory').hidden=true;review=candidate;showReview();updateMessage('Saved review opened locally; no network request made.');
  }catch(err){updateMessage(`Could not open review: ${err.message}`);}finally{ev.target.value='';}
}
init();
