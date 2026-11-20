import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverRepository, fetchRepositorySources, clearCache} from '../src/github.js';

const encoder = text => Buffer.from(text).toString('base64');

function json(body, headers = {}) {
  return new Response(JSON.stringify(body), {status:200, headers:{'content-type':'application/json', 'x-ratelimit-limit':'60', 'x-ratelimit-remaining':'59', 'x-ratelimit-reset':'1795176000', ...headers}});
}

function repoRouter(overrides = []) {
  return [
    ['https://api.github.com/repos/o/r', () => json({private:false, default_branch:'main', description:'A library', topics:['library'], license:{spdx_id:'MIT', name:'MIT License'}, language:'JavaScript', archived:false, stargazers_count:3, forks_count:1, updated_at:'2026-11-20T00:00:00Z', html_url:'https://github.com/o/r'})],
    ['https://api.github.com/repos/o/r/commits/main', () => json({sha:'abcdef1234567890', commit:{tree:{sha:'tree123'}}})],
    ['https://api.github.com/repos/o/r/git/trees/tree123?recursive=1', () => json({truncated:false, tree:[
      {path:'README.md', type:'blob', size:40, sha:'blob-readme'},
      {path:'docs/security.md', type:'blob', size:50, sha:'blob-security'},
      {path:'package.json', type:'blob', size:60, sha:'blob-package'},
      {path:'src/index.js', type:'blob', size:70, sha:'blob-source'},
      {path:'large.md', type:'blob', size:200000, sha:'blob-large'},
      {path:'image.png', type:'blob', size:80, sha:'blob-image'},
      {path:'empty.md', type:'blob', size:0, sha:'blob-empty'}
    ]})],
    ['https://api.github.com/repos/o/r/git/blobs/blob-readme', () => json({encoding:'base64', content:encoder('# README\nKeyboard and accessible name guidance.')})],
    ['https://api.github.com/repos/o/r/git/blobs/blob-security', () => json({encoding:'base64', content:encoder('# Security\nThreat model and trust boundary.')})],
    ['https://api.github.com/repos/o/r/git/blobs/blob-source', () => json({encoding:'base64', content:encoder("export const name = 'demo';")})],
    ['https://api.github.com/repos/o/r/issues?state=all&per_page=30&sort=updated&direction=desc', () => json([{number:1, title:'Issue one', body:'Personal data retention', html_url:'https://github.com/o/r/issues/1', state:'open', labels:[{name:'privacy'}], created_at:'2026-11-01T00:00:00Z', updated_at:'2026-11-02T00:00:00Z', comments:2}])],
    ['https://api.github.com/repos/o/r/pulls?state=all&per_page=10&sort=updated&direction=desc', () => json([{number:2, title:'PR two', body:'Security fix', html_url:'https://github.com/o/r/pull/2', state:'closed', merged_at:'2026-11-03T00:00:00Z', labels:[{name:'security'}], created_at:'2026-11-01T00:00:00Z', updated_at:'2026-11-03T00:00:00Z', comments:1}])],
    ...overrides
  ];
}

function installFetch(router, handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    calls.push(href);
    if (handler) {
      const custom = await handler(href, init, calls.length);
      if (custom) return custom;
    }
    const route = router.find(([prefix]) => href === prefix);
    if (!route) throw new Error(`Unexpected fetch: ${href}`);
    return route[1]();
  };
  return calls;
}

test('Discovery and source retrieval are bounded and preserve provenance', async () => {
  clearCache();
  const originalFetch = globalThis.fetch;
  const calls = installFetch(repoRouter());
  try {
    const discovery = await discoverRepository('https://github.com/o/r', 'main', {includeCode:true});
    assert.equal(discovery.sha, 'abcdef1234567890');
    assert.equal(discovery.repo.license, 'MIT');
    assert.equal(discovery.repo.defaultBranch, 'main');
    assert.deepEqual(discovery.inventory.counts, {discovered:7, documents:2, code:2, skippedLarge:1, skippedUnsupported:1, skippedEmpty:1});
    assert.equal(discovery.suggestion.type, 'library');
    assert.ok(discovery.inventory.documents.every(file => file.size <= 140000));
    assert.equal(discovery.rateLimit.remaining, 59);
    const sources = await fetchRepositorySources({repo:discovery.repo, sha:discovery.sha, tree:discovery.tree, paths:['README.md','src/index.js']});
    assert.deepEqual(sources.files.map(file => file.path), ['README.md','src/index.js']);
    assert.match(sources.files[0].content, /Keyboard/);
    assert.equal(sources.issues.find(issue => issue.kind === 'issue-discussion').labels[0], 'privacy');
    const merged = sources.issues.find(issue => issue.kind === 'pull-request-discussion');
    assert.equal(merged.merged, true);
    assert.equal(merged.mergedAt, '2026-11-03T00:00:00Z');
    assert.ok(sources.retrievedAt);
    assert.equal(calls.length, 7);
  } finally { globalThis.fetch = originalFetch; }
});

test('A bounded 429 retry succeeds when Retry-After is short', async () => {
  clearCache();
  const originalFetch = globalThis.fetch;
  let first = true;
  installFetch(repoRouter(), (href) => {
    if (href === 'https://api.github.com/repos/o/r' && first) {
      first = false;
      return new Response('{}', {status:429, headers:{'retry-after':'0', 'x-ratelimit-limit':'60', 'x-ratelimit-remaining':'30', 'x-ratelimit-reset':'1795176000'}});
    }
    return null;
  });
  try {
    const discovery = await discoverRepository('https://github.com/o/r', 'main');
    assert.equal(discovery.sha, 'abcdef1234567890');
  } finally { globalThis.fetch = originalFetch; }
});

test('A primary rate-limit failure is reported with reset guidance', async () => {
  clearCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', {status:403, headers:{'x-ratelimit-limit':'60', 'x-ratelimit-remaining':'0', 'x-ratelimit-reset':'1795176000'}});
  try {
    await assert.rejects(() => discoverRepository('https://github.com/o/r', 'main'), /rate limit reached/i);
  } finally { globalThis.fetch = originalFetch; }
});

test('Immutable tree and blob responses are cached without caching mutable discussions', async () => {
  clearCache();
  const originalFetch = globalThis.fetch;
  const calls = installFetch(repoRouter());
  try {
    await discoverRepository('https://github.com/o/r', 'main');
    await discoverRepository('https://github.com/o/r', 'main');
    assert.equal(calls.filter(url => url.includes('/git/trees/')).length, 1);
    const discovery = await discoverRepository('https://github.com/o/r', 'main');
    await fetchRepositorySources({repo:discovery.repo, sha:discovery.sha, tree:discovery.tree, paths:['README.md','src/index.js']});
    await fetchRepositorySources({repo:discovery.repo, sha:discovery.sha, tree:discovery.tree, paths:['README.md','src/index.js']});
    assert.equal(calls.filter(url => url.includes('/git/blobs/')).length, 2);
    assert.equal(calls.filter(url => url.includes('/issues?')).length, 2);
  } finally { globalThis.fetch = originalFetch; clearCache(); }
});

test('Discovery can be scoped to a monorepo subdirectory', async () => {
  clearCache();
  const originalFetch = globalThis.fetch;
  installFetch(repoRouter());
  try {
    const discovery = await discoverRepository('https://github.com/o/r', 'main', {scopePath:'docs'});
    assert.equal(discovery.scopePath, 'docs');
    assert.equal(discovery.inventory.counts.documents, 1);
    assert.equal(discovery.inventory.counts.code, 0);
    assert.equal(discovery.inventory.documents[0].path, 'docs/security.md');
    assert.ok(discovery.inventory.counts.discovered < 7);
  } finally { globalThis.fetch = originalFetch; clearCache(); }
});
