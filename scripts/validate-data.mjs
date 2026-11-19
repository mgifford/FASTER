import {readFileSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read = relative => {
  if (!/^data\/[a-z0-9/_-]+\.json$/.test(relative)) throw Error(`Invalid pack file path: ${relative}`);
  return JSON.parse(readFileSync(join(root,relative),'utf8'));
};
const registry=read('data/presets.json');
if (!Array.isArray(registry.presets)||!registry.presets.length)throw Error('No review packs');
const presetIds=new Set();
for(const preset of registry.presets){
  if(!/^[a-z][a-z0-9-]+$/.test(preset.id)||presetIds.has(preset.id))throw Error(`Invalid or duplicate preset ${preset.id}`);
  presetIds.add(preset.id);
  if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(preset.version||''))throw Error(`Missing or invalid pack version in ${preset.id}`);
  const sources=read(preset.sources), questionsFile=read(preset.questions), rulesFile=read(preset.rules);
  const {questions}=questionsFile, {rules}=rulesFile;
  if([sources.version,questionsFile.version,rulesFile.version].some(v=>v!==preset.version))throw Error(`Pack version mismatch in ${preset.id}`);
  const areas=new Set(sources.reviewAreas.map(a=>a.id));
  if(areas.size!==sources.reviewAreas.length)throw Error(`Duplicate area ID in ${preset.id}`);
  if(preset.defaultAreas.some(a=>!areas.has(a)))throw Error(`Invalid default area in ${preset.id}`);
  const ids=new Set(), ruleIds=new Set();
  for(const q of questions){
    if(ids.has(q.id)||!areas.has(q.area)||typeof q.prompt!=='string'||!q.prompt.trim()||!q.why)throw Error(`Invalid question ${q.id} in ${preset.id}`);
    ids.add(q.id);
  }
  for(const r of rules){
    if(ruleIds.has(r.id)||!ids.has(r.questionId)||!Array.isArray(r.phrases)||!r.phrases.length||r.phrases.some(x=>typeof x!=='string'||!x.trim()))throw Error(`Invalid rule ${r.id} in ${preset.id}`);
    ruleIds.add(r.id);
  }
  if(![...ids].every(id=>rules.some(r=>r.questionId===id)))throw Error(`Unmapped question in ${preset.id}`);
  if(preset.kind==='w3c-aligned-starter'){
    if(sources.reviewAreas.filter(a=>a.formalW3CHorizontalArea===true).length!==5)throw Error('W3C starter must keep exactly five formal review areas');
    if(!sources.reviewAreas.find(a=>a.id==='sustainability'&&a.formalW3CHorizontalArea===false))throw Error('Sustainability must remain experimental');
  }
  console.log(`${preset.id} (${preset.version}): valid ${areas.size} areas, ${ids.size} questions, ${ruleIds.size} rules.`);
}
