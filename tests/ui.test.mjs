import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('The results heading is focusable after a scan',()=>{
  assert.match(html,/id="results-heading" tabindex="-1"/);
});

test('Muted text uses a contrast-safe token and file inputs can reflow',()=>{
  assert.match(css,/--muted:color-mix\(in srgb,CanvasText 65%,Canvas\)/);
  assert.doesNotMatch(css,/--muted:GrayText/);
  assert.match(css,/input\[type=file\]\{width:100%;max-width:100%;min-width:0\}/);
  assert.match(css,/\.help\{[^}]*overflow-wrap:anywhere/);
  assert.match(css,/\.meta\{[^}]*overflow-wrap:anywhere/);
  assert.match(css,/\.status\{[^}]*overflow-wrap:anywhere/);
});

test('The deployed page offers the AGPL source',()=>{
  assert.match(html,/Source \(AGPL-3\.0\)/);
  assert.match(html,/rel="license" href="https:\/\/www\.gnu\.org\/licenses\/agpl-3\.0\.html"/);
});

test('The discovery inventory is present and focusable',()=>{
  assert.match(html,/id="inventory" hidden aria-labelledby="inventory-heading"/);
  assert.match(html,/id="inventory-heading" tabindex="-1"/);
  assert.match(html,/id="document-list"/);
  assert.match(html,/id="analyze-selected" type="button" disabled/);
});

test('The reviewer identity field is present',()=>{
  assert.match(html,/id="reviewer-name"/);
});

test('The monorepo scope field is present',()=>{
  assert.match(html,/id="scope-path"/);
  assert.match(html,/id="repo-homepage"/);
});
