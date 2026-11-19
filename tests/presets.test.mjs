import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const registry=read('data/presets.json');
const general=registry.presets.find(p=>p.id==='general');
const w3c=registry.presets.find(p=>p.id==='w3c-horizontal-starter');
test('General pack is the default and not tied to a standards organization',()=>{
  assert.equal(registry.presets[0].id,'general');
  assert.match(general.description,/applications/);
  assert.equal(read(general.questions).questions.length,20);
  assert.equal(read(general.sources).reviewAreas.some(a=>a.formalW3CHorizontalArea===true),false);
});
test('W3C preparation pack is optional and has five formal areas plus experimental sustainability',()=>{
  const a=read(w3c.sources).reviewAreas;
  assert.equal(a.filter(x=>x.formalW3CHorizontalArea).length,5);
  assert.equal(a.find(x=>x.id==='sustainability').formalW3CHorizontalArea,false);
  assert.match(w3c.description,/Not authoritative/);
});
