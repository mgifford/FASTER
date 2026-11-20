import {parseGitHubUrl,safeRef,safeRepositoryPath,selectFiles,detectFileType,buildInventory,suggestProjectType} from './review-core.js';

const API = 'https://api.github.com';
let lastRateLimit = null;

const TREE_CACHE_LIMIT = 10;
const BLOB_CACHE_LIMIT = 80;
const treeCache = new Map();
const blobCache = new Map();

function cacheGet(map, key) {
  if (!map.has(key)) return undefined;
  const value = map.get(key);
  map.delete(key); map.set(key, value);
  return value;
}

function cacheSet(map, key, value, limit) {
  map.set(key, value);
  while (map.size > limit) map.delete(map.keys().next().value);
}

export function clearCache() {
  treeCache.clear(); blobCache.clear();
}

function retryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', onAbort, {once:true});
  });
}

async function githubGet(path, signal, attempt = 0) {
  const response = await fetch(`${API}${path}`, { signal, headers: { Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' } });
  const limitHeader = response.headers.get('x-ratelimit-limit');
  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const resetHeader = response.headers.get('x-ratelimit-reset');
  const limit = limitHeader === null ? NaN : Number(limitHeader);
  const remaining = remainingHeader === null ? NaN : Number(remainingHeader);
  const reset = resetHeader === null ? NaN : Number(resetHeader);
  if (Number.isFinite(limit) && Number.isFinite(remaining)) lastRateLimit = {limit, remaining, reset:Number.isFinite(reset) ? reset : null};
  if (!response.ok) {
    const status = response.status;
    const retryable = status === 429 || status === 403 || status === 502 || status === 503 || status === 504;
    const retryDelay = retryAfterMs(response.headers.get('retry-after'));
    const waitMs = retryDelay ?? (status >= 500 ? 500 : 1000);
    if (retryable && attempt < 1 && remaining !== 0 && waitMs <= 5000) {
      await wait(waitMs, signal);
      return githubGet(path, signal, attempt + 1);
    }
    const when = Number.isFinite(reset) ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : ' Try again later.';
    if (remaining === 0) throw new Error(`GitHub API rate limit reached (${status}).${when}`);
    if (status === 403) throw new Error(`GitHub API refused the request (403), possibly a secondary rate limit or permission problem.${when}`);
    throw new Error(`GitHub API returned ${status}. Check the repository, reference and network connection.`);
  }
  return response.json();
}

function decodeBase64(text) {
  const binary = atob(text.replace(/\s/g, ''));
  return new TextDecoder('utf-8', {fatal:false}).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function repoMetadata(info) {
  return {
    name: info.name || '',
    description: info.description || '',
    defaultBranch: info.default_branch || '',
    topics: Array.isArray(info.topics) ? info.topics : [],
    license: info.license?.spdx_id || null,
    licenseName: info.license?.name || null,
    language: info.language || null,
    archived: Boolean(info.archived),
    stars: Number(info.stargazers_count) || 0,
    forks: Number(info.forks_count) || 0,
    updatedAt: info.updated_at || null,
    homepage: info.homepage || null,
    htmlUrl: info.html_url || null
  };
}

function mapIssue(i) {
  return {
    number:i.number,
    title:i.title,
    body:String(i.body || '').slice(0,7000),
    html_url:i.html_url,
    state:i.state,
    labels:(i.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean),
    createdAt:i.created_at || null,
    updatedAt:i.updated_at || null,
    comments:Number(i.comments) || 0,
    kind:'issue-discussion'
  };
}

function mapPull(i) {
  return {
    number:i.number,
    title:i.title,
    body:String(i.body || '').slice(0,7000),
    html_url:i.html_url,
    state:i.state,
    merged:Boolean(i.merged_at),
    mergedAt:i.merged_at || null,
    draft:Boolean(i.draft),
    labels:(i.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean),
    createdAt:i.created_at || null,
    updatedAt:i.updated_at || null,
    comments:Number(i.comments) || 0,
    kind:'pull-request-discussion'
  };
}

export async function discoverRepository(url, ref, { includeCode = false, preferredDocumentPath = '', scopePath = '', signal, onProgress = () => {} } = {}) {
  const repo = parseGitHubUrl(url);
  const documentPath = safeRepositoryPath(preferredDocumentPath);
  const scope = safeRepositoryPath(scopePath);
  const prefix = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  onProgress('Resolving repository metadata and commit...');
  const info = await githubGet(prefix, signal);
  if (info.private) throw new Error('This starter supports public repositories only.');
  const metadata = repoMetadata(info);
  const preferredRef = safeRef(ref || info.default_branch);
  const commit = await githubGet(`${prefix}/commits/${encodeURIComponent(preferredRef)}`, signal);
  const sha = commit.sha;
  onProgress('Listing files at the pinned commit...');
  const treeSha = commit.commit.tree.sha;
  let treeResponse = cacheGet(treeCache, treeSha);
  if (!treeResponse) {
    treeResponse = await githubGet(`${prefix}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`, signal);
    cacheSet(treeCache, treeSha, treeResponse, TREE_CACHE_LIMIT);
  }
  const tree = Array.isArray(treeResponse.tree) ? treeResponse.tree : [];
  const inventory = buildInventory(tree, {includeCode, preferredDocumentPath:documentPath, scopePath:scope});
  const scopedTree = scope ? tree.filter(file => file.path === scope || file.path.startsWith(`${scope}/`)) : tree;
  const suggestion = suggestProjectType({repo:{...metadata, description:metadata.description}, tree:scopedTree});
  const warnings = [];
  if (treeResponse.truncated) warnings.push('GitHub truncated the tree; document coverage is incomplete.');
  if (metadata.archived) warnings.push('This repository is archived; its current branch may not receive fixes.');
  if (documentPath && !inventory.documents.some(file => file.path === documentPath)) warnings.push(`Requested document is not a supported document candidate: ${documentPath}. Check its path, size, or format.`);
  if (!inventory.counts.documents) warnings.push(scope ? `No reviewable documents were found within the scope ${scope}.` : 'No reviewable documents were found in the sampled tree. Add a document path or choose a repository with a README.');
  return {repo:{...repo, ...metadata}, sha, tree, inventory, suggestion, warnings, scopePath:scope || null, rateLimit:lastRateLimit};
}

export async function fetchRepositorySources({repo, sha, tree = [], paths = [], signal, onProgress = () => {}} = {}) {
  const uniquePaths = [...new Set(paths)].slice(0, 20);
  const byPath = new Map((Array.isArray(tree) ? tree : []).filter(file => file.type === 'blob').map(file => [file.path, file]));
  const files = [], warnings = [];
  for (const [index, path] of uniquePaths.entries()) {
    const file = byPath.get(path);
    if (!file) { warnings.push(`Selected file was not present in the pinned tree: ${path}`); continue; }
    onProgress(`Reading source ${index + 1}/${uniquePaths.length}: ${path}`);
    try {
      let content = cacheGet(blobCache, file.sha);
      if (content === undefined) {
        const blob = await githubGet(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/git/blobs/${encodeURIComponent(file.sha)}`, signal);
        if (blob.encoding !== 'base64') { warnings.push(`Skipped unsupported encoding: ${path}`); continue; }
        content = decodeBase64(blob.content).slice(0, 140000);
        cacheSet(blobCache, file.sha, content, BLOB_CACHE_LIMIT);
      }
      files.push({path, content, kind:detectFileType(path) === 'code' ? 'implementation-code' : 'repository-document'});
    } catch (err) {
      if (signal?.aborted) throw err;
      warnings.push(`Could not read ${path}: ${err.message}`);
    }
  }
  const prefix = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  onProgress('Collecting a bounded issue sample...');
  let issues = [];
  try {
    const all = await githubGet(`${prefix}/issues?state=all&per_page=30&sort=updated&direction=desc`, signal);
    issues = all.filter(issue => !issue.pull_request).slice(0, 20).map(mapIssue);
  } catch (err) {
    if (signal?.aborted) throw err;
    warnings.push(`Could not retrieve issues: ${err.message}`);
  }
  onProgress('Collecting a bounded pull request sample...');
  let prs = [];
  try {
    const all = await githubGet(`${prefix}/pulls?state=all&per_page=10&sort=updated&direction=desc`, signal);
    prs = all.slice(0, 10).map(mapPull);
  } catch (err) {
    if (signal?.aborted) throw err;
    warnings.push(`Could not retrieve PRs: ${err.message}`);
  }
  warnings.push('Only the selected source files, up to 20 recently updated issues and up to 10 recently updated PRs were searched. Missing evidence is not proof of absence.');
  warnings.push('Issue and PR pages are mutable; discussions are not pinned to the source commit and cannot prove merged behavior. External documents, generated output and complete history are not indexed.');
  return {files, issues:[...issues, ...prs], warnings, retrievedAt:new Date().toISOString(), rateLimit:lastRateLimit};
}

export async function inspectRepository(url, ref, options = {}) {
  const discovery = await discoverRepository(url, ref, options);
  const chosen = selectFiles(discovery.tree, {includeCode:options.includeCode, preferredDocumentPath:options.preferredDocumentPath, scopePath:options.scopePath});
  const sources = await fetchRepositorySources({repo:discovery.repo, sha:discovery.sha, tree:discovery.tree, paths:chosen.map(file => file.path), signal:options.signal, onProgress:options.onProgress});
  return {...discovery, ...sources, warnings:[...discovery.warnings, ...sources.warnings]};
}

export function getRateLimit() {
  return lastRateLimit;
}
