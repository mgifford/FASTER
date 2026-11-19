import { parseGitHubUrl, safeRef, safeRepositoryPath, selectFiles, detectFileType } from './review-core.js';

const API = 'https://api.github.com';
async function githubGet(path, signal) {
  const response = await fetch(`${API}${path}`, { signal, headers: { Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' } });
  if (!response.ok) {
    const rate = response.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub API returned ${response.status}. ${rate === '0' ? 'Rate limit reached; try later or use a server-side cache.' : 'Check the repository and reference.'}`);
  }
  return response.json();
}

function decodeBase64(text) {
  const binary = atob(text.replace(/\s/g, ''));
  return new TextDecoder('utf-8', {fatal:false}).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function escapedPath(path) { return path.split('/').map(encodeURIComponent).join('/'); }

export async function inspectRepository(url, ref, { includeCode = false, preferredDocumentPath = '', signal, onProgress = () => {} } = {}) {
  const repo = parseGitHubUrl(url);
  const documentPath = safeRepositoryPath(preferredDocumentPath);
  const prefix = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  onProgress('Resolving repository and commit...');
  const info = await githubGet(prefix, signal);
  if (info.private) throw new Error('This starter supports public repositories only.');
  const preferredRef = safeRef(ref || info.default_branch);
  const commit = await githubGet(`${prefix}/commits/${encodeURIComponent(preferredRef)}`, signal);
  const sha = commit.sha;
  onProgress('Listing files at pinned commit...');
  const tree = await githubGet(`${prefix}/git/trees/${encodeURIComponent(commit.commit.tree.sha)}?recursive=1`, signal);
  const warnings = [];
  if (tree.truncated) warnings.push('GitHub truncated the tree; document coverage is incomplete.');
  const chosen = selectFiles(tree.tree || [], {includeCode, preferredDocumentPath: documentPath});
  if (documentPath && !chosen.some(f => f.path === documentPath)) warnings.push(`Requested document not included in scanned sample: ${documentPath}. Check its path, size, or format.`);
  const files = [];
  for (const [i, f] of chosen.entries()) {
    onProgress(`Reading source ${i + 1}/${chosen.length}: ${f.path}`);
    try {
      const blob = await githubGet(`${prefix}/git/blobs/${encodeURIComponent(f.sha)}`, signal);
      if (blob.encoding !== 'base64') { warnings.push(`Skipped unsupported encoding: ${f.path}`); continue; }
      files.push({ path:f.path, content:decodeBase64(blob.content).slice(0,140000), kind:detectFileType(f.path)==='code' ? 'implementation-code' : 'repository-document' });
    } catch (err) {
      if (signal?.aborted) throw err;
      warnings.push(`Could not read ${f.path}: ${err.message}`);
    }
  }
  onProgress('Collecting a bounded issue sample...');
  let issues = [];
  try {
    const all = await githubGet(`${prefix}/issues?state=all&per_page=30&sort=updated&direction=desc`, signal);
    issues = all.filter(i => !i.pull_request).slice(0,20).map(i => ({number:i.number,title:i.title,body:String(i.body || '').slice(0,7000),html_url:i.html_url,state:i.state,kind:'issue-discussion'}));
  } catch (err) {
    if (signal?.aborted) throw err;
    warnings.push(`Could not retrieve issues: ${err.message}`);
  }
  onProgress('Collecting a bounded pull request sample...');
  let prs = [];
  try {
    const all = await githubGet(`${prefix}/pulls?state=all&per_page=10&sort=updated&direction=desc`, signal);
    prs = all.slice(0,10).map(i => ({number:i.number,title:i.title,body:String(i.body || '').slice(0,7000),html_url:i.html_url,state:i.state,mergedAt:i.merged_at || null,kind:'pull-request-discussion'}));
  } catch (err) {
    if (signal?.aborted) throw err;
    warnings.push(`Could not retrieve PRs: ${err.message}`);
  }
  warnings.push('Only selected source files, up to 20 recently updated issues and up to 10 recently updated PRs were searched. Missing evidence is not proof of absence.');
  warnings.push('Issue and PR pages are mutable; discussions are not pinned to the source commit and cannot prove merged behavior. External documents, generated output and complete history are not indexed.');
  return {repo:{...repo, description:info.description || '', defaultBranch:info.default_branch},sha,files,issues:[...issues,...prs],warnings};
}
