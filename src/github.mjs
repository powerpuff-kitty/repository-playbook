/** Read-only GitHub.com observation collector. Nothing here reads or runs a checkout. */
const API = 'https://api.github.com';
const VERSION = '2022-11-28';
const MAX_BODY = 1024 * 1024;
const MAX_REQUESTS = 30;
const MAX_PAGES = 5;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const HEALTH = [
  ['CONTRIBUTING.md', 'contributing'],
  ['CODE_OF_CONDUCT.md', 'code_of_conduct_file'],
  ['SECURITY.md', 'security'],
];

export function repositoryName(value) {
  if (typeof value !== 'string' || !REPO_PATTERN.test(value) || value.length > 200 ||
      value.split('/').some(s => s === '.' || s === '..' || s.endsWith('.git'))) {
    throw new Error('Expected a GitHub OWNER/REPO identifier (not a URL or arbitrary API path)');
  }
  return value;
}

function reason(result) {
  if (result.ok) return '';
  if (result.status === 429 || result.rateLimited) return 'GitHub rate limit reached; no automatic retry performed.';
  if (result.status === 401) return 'GitHub authentication rejected.';
  if (result.status === 403) return 'GitHub returned 403; permissions or policy prevent verification.';
  if (result.status === 404) return 'GitHub returned 404; this endpoint may be absent or inaccessible.';
  return result.error || `GitHub returned HTTP ${result.status}.`;
}

async function boundedJson(response) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY) throw new Error('GitHub response exceeded the 1 MiB limit');
  let total = 0;
  const chunks = [];
  if (response.body) {
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > MAX_BODY) {
        await response.body.cancel?.().catch(() => {});
        throw new Error('GitHub response exceeded the 1 MiB limit');
      }
      chunks.push(Buffer.from(chunk));
    }
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('GitHub returned an invalid or unexpected JSON response'); }
}

export class GitHubReader {
  constructor({ fetchImpl = globalThis.fetch, token = '', timeoutMs = 8000, maxRequests = MAX_REQUESTS } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');
    this.fetchImpl = fetchImpl;
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.maxRequests = Math.min(Math.max(maxRequests, 1), MAX_REQUESTS);
    this.requests = 0;
  }
  async get(path) {
    // Only caller-constructed API paths are allowed. Never follow untrusted redirects.
    const url = new URL(path, API);
    if (url.origin !== API || !url.pathname.startsWith('/repos/')) throw new Error('Disallowed GitHub API URL');
    if (++this.requests > this.maxRequests) return { ok: false, status: 0, error: 'GitHub request budget exhausted.', url: url.href };
    try {
      const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': VERSION, 'user-agent': 'repository-playbook/0.4' };
      if (this.token) headers.authorization = `Bearer ${this.token}`;
      const response = await this.fetchImpl(url.href, { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
      if (!response.ok) return { ok: false, status: response.status, rateLimited: response.headers.get('x-ratelimit-remaining') === '0', url: url.href };
      const data = await boundedJson(response);
      return { ok: true, status: response.status, data, link: response.headers.get('link'), url: url.href };
    } catch (error) {
      return { ok: false, status: 0, error: error?.name === 'TimeoutError' ? 'GitHub request timed out.' : 'GitHub request could not be verified (network, redirect or response error).', url: url.href };
    }
  }
  async pages(endpoint, query = '') {
    const root = new URL(`${endpoint}${query}`, API);
    const items = [];
    let next = root.href;
    const visited = new Set();
    for (let page = 0; page < MAX_PAGES && next; page++) {
      if (visited.has(next)) return { ok: false, items, reason: 'GitHub pagination cycle detected.' };
      visited.add(next);
      const response = await this.get(next);
      if (!response.ok) return { ok: false, items, reason: reason(response) };
      if (!Array.isArray(response.data)) return { ok: false, items, reason: 'Unexpected GitHub list response.' };
      items.push(...response.data);
      const match = response.link?.match(/<([^>]+)>;\s*rel="next"/);
      next = match?.[1] ?? null;
      if (next) {
        const url = new URL(next, API);
        if (url.origin !== API || url.pathname !== root.pathname || !/^\d+$/.test(url.searchParams.get('page') ?? '')) {
          return { ok: false, items, reason: 'Untrusted GitHub pagination link.' };
        }
        next = url.href;
      }
    }
    return next ? { ok: false, items, reason: 'GitHub pagination limit reached.' } : { ok: true, items };
  }
}

const observed = (key, value, source, note) => ({ key, status: 'observed', value: Boolean(value), source, ...(note ? { reason: note } : {}) });
const unknown = (key, source, note) => ({ key, status: 'unknown', value: false, source, reason: note });
const matchesChecks = checks => Array.isArray(checks?.contexts) && checks.contexts.length > 0 ||
  Array.isArray(checks?.checks) && checks.checks.some(c => typeof c.context === 'string' && c.context.trim());
const urlFor = path => `${API}${path}`;

async function fileFromContents(api, base, filename, ref) {
  // Respect documented precedence rather than assuming a file exists at the root.
  let unavailable = null;
  for (const prefix of ['.github/', '', 'docs/']) {
    const endpoint = `${base}/contents/${prefix}${filename}?ref=${encodeURIComponent(ref)}`;
    const res = await api.get(endpoint);
    if (res.ok) {
      if (res.data?.type !== 'file') return { status: 'unknown', reason: 'GitHub contents endpoint did not return a file.', source: urlFor(endpoint) };
      if (res.data.size > 0) return { status: 'found', source: urlFor(endpoint), path: `${prefix}${filename}` };
      // An empty file is not enough to meet the rule; GitHub may nonetheless treat it as overriding defaults.
      return { status: 'empty', source: urlFor(endpoint) };
    }
    if (res.status !== 404) { unavailable = reason(res); break; }
  }
  return unavailable ? { status: 'unknown', source: urlFor(`${base}/contents/${filename}`), reason: unavailable } : { status: 'absent' };
}

async function communityFacts(api, base, owner, branch) {
  const url = `${base}/community/profile`;
  const profile = await api.get(url);
  // The community profile knows about recognised contribution and conduct files, including defaults.
  // It does not consistently expose SECURITY.md, so SECURITY uses contents fallback.
  const ownerBase = `/repos/${encodeURIComponent(owner)}/.github`;
  let defaultMeta;
  async function inherited(filename) {
    if (defaultMeta === undefined) defaultMeta = await api.get(ownerBase);
    if (!defaultMeta.ok) {
      if (defaultMeta.status === 404) return { status: 'absent' }; // No accessible public defaults.
      return { status: 'unknown', source: urlFor(ownerBase), reason: reason(defaultMeta) };
    }
    if (defaultMeta.data.private !== false || !defaultMeta.data.default_branch) return { status: 'unknown', source: urlFor(ownerBase), reason: 'Default .github repository is not confirmed public with a default branch.' };
    return fileFromContents(api, ownerBase, filename, defaultMeta.data.default_branch);
  }
  const facts = [];
  for (const [filename, profileKey] of HEALTH) {
    const key = `community.${filename}`;
    if (profile.ok && profile.data?.files?.[profileKey]) {
      const entry = profile.data.files[profileKey];
      const source = typeof entry.html_url === 'string' && entry.html_url.startsWith('https://github.com/') ? entry.html_url : urlFor(url);
      facts.push(observed(key, true, source, 'GitHub community profile reports a recognised file; its contents and reporting routes are not validated.'));
      continue;
    }
    const local = await fileFromContents(api, base, filename, branch);
    if (local.status === 'found') { facts.push(observed(key, true, local.source, `GitHub reports a nonempty ${local.path}.`)); continue; }
    if (local.status === 'empty') {
      facts.push(unknown(key, local.source, 'File exists but is empty; effective GitHub inheritance must be reviewed.'));
      continue;
    }
    if (local.status === 'unknown') { facts.push(unknown(key, local.source, local.reason)); continue; }
    const fallback = await inherited(filename);
    if (fallback.status === 'found') facts.push(observed(key, true, fallback.source, `Recognised public default .github/${filename}; effectiveness and contents require review.`));
    else if (fallback.status === 'empty') facts.push(unknown(key, fallback.source, 'Public default file exists but is empty.'));
    else if (fallback.status === 'unknown') facts.push(unknown(key, fallback.source, fallback.reason));
    else if (profile.ok && profile.data?.files && filename !== 'SECURITY.md') facts.push(observed(key, false, urlFor(url), 'No file observed locally, in the community profile, or in public account defaults.'));
    else facts.push(unknown(key, urlFor(url), filename === 'SECURITY.md' ? 'No security file found; GitHub community profile does not provide sufficient negative evidence.' : `Community profile unavailable: ${reason(profile)}`));
  }
  return facts;
}

async function requiredCheckFact(api, base, branch, branchRes) {
  const key = 'required_checks_enforced';
  const branchUrl = `${base}/branches/${encodeURIComponent(branch)}`;
  const statusUrl = `${branchUrl}/protection`;
  const statusRes = await api.get(statusUrl);
  const rulesUrl = `${base}/rules/branches/${encodeURIComponent(branch)}`;
  const rulesRes = await api.pages(rulesUrl, '?per_page=100');

  const classic = statusRes.ok && matchesChecks(statusRes.data?.required_status_checks);
  if (classic && statusRes.data?.enforce_admins?.enabled === true) {
    return observed(key, true, urlFor(statusUrl), 'Classic branch protection has required checks and includes administrators. Other bypass policies are not exhaustively verified.');
  }

  if (rulesRes.ok) {
    const rules = rulesRes.items.filter(r => r?.type === 'required_status_checks' && Array.isArray(r.parameters?.required_status_checks) && r.parameters.required_status_checks.length);
    for (const item of rules) {
      if (!Number.isSafeInteger(item.ruleset_id)) continue;
      const detailUrl = `${base}/rulesets/${item.ruleset_id}?includes_parents=true`;
      const detail = await api.get(detailUrl);
      // GitHub deliberately hides bypass actors from tokens lacking write permissions.
      if (detail.ok && detail.data?.enforcement === 'active' && Array.isArray(detail.data.bypass_actors) && detail.data.bypass_actors.length === 0) {
        return observed(key, true, urlFor(detailUrl), 'An active ruleset requires status checks and reports no bypass actors. Check name applicability still needs review.');
      }
    }
    if (classic || rules.length) return unknown(key, urlFor(rulesUrl), 'Required checks found, but administrative or ruleset bypasses were not fully observable.');
    if (statusRes.ok && !matchesChecks(statusRes.data?.required_status_checks)) {
      return observed(key, false, urlFor(statusUrl), 'Readable classic protection and active branch rules contain no required status checks.');
    }
    if (branchRes.ok && branchRes.data?.protected === false && statusRes.status === 404) {
      return observed(key, false, urlFor(rulesUrl), 'Unprotected default branch and no active required-status-check rules.');
    }
  }
  const failures = [!branchRes.ok && reason(branchRes), !statusRes.ok && statusRes.status !== 404 && reason(statusRes), !rulesRes.ok && rulesRes.reason].filter(Boolean);
  return unknown(key, urlFor(rulesUrl), failures.join('; ') || 'Protection/ruleset evidence or bypass visibility is incomplete.');
}

/** Collect dated settings facts. Does not execute target code, mutate GitHub, or fetch target sources. */
export async function collectGitHubFacts(name, { fetchImpl, token = '', now = new Date(), timeoutMs = 8000, maxRequests } = {}) {
  repositoryName(name);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid collection time');
  const [owner, repo] = name.split('/');
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const api = new GitHubReader({ fetchImpl, token, timeoutMs, maxRequests });
  const meta = await api.get(base);
  if (!meta.ok) throw new Error(`Cannot read GitHub repository metadata: ${reason(meta)}`);
  if (!meta.data || typeof meta.data.default_branch !== 'string' || !meta.data.default_branch ||
      typeof meta.data.full_name !== 'string' || meta.data.full_name.toLowerCase() !== name.toLowerCase()) throw new Error('Unexpected repository identity or default branch in GitHub response');
  const branch = meta.data.default_branch;
  const branchInfo = await api.get(`${base}/branches/${encodeURIComponent(branch)}`);
  const revision = branchInfo.ok && /^[0-9a-f]{40}$/i.test(branchInfo.data?.commit?.sha ?? '') ? branchInfo.data.commit.sha : null;
  const metadataSource = urlFor(base);
  const m = meta.data;
  const descriptionFact = typeof m.description === 'string' || m.description === null ?
    observed('description_present', typeof m.description === 'string' && !!m.description.trim(), metadataSource) :
    unknown('description_present', metadataSource, 'Description was omitted from repository metadata.');
  const homepageFact = typeof m.homepage === 'string' || m.homepage === null ?
    observed('homepage_present', typeof m.homepage === 'string' && !!m.homepage.trim(), metadataSource, 'A configured homepage is not proof the URL works or is suitable.') :
    unknown('homepage_present', metadataSource, 'Homepage field was not provided.');
  const visibility = typeof m.private === 'boolean' ? !m.private :
    ['public','private','internal'].includes(m.visibility) ? m.visibility === 'public' : null;
  const visibilityFact = typeof visibility === 'boolean' ?
    observed('repository_public', visibility, metadataSource, `GitHub reports ${visibility ? 'public' : 'nonpublic'} visibility. This is not a recommendation to change access.`) :
    unknown('repository_public', metadataSource, 'Repository visibility was not available.');
  const archiveFact = typeof m.archived === 'boolean' ?
    observed('repository_archived', m.archived, metadataSource, 'Archival state is contextual, not an intrinsic quality failure.') :
    unknown('repository_archived', metadataSource, 'Archived state was not available.');
  let licenseFact;
  if (!Object.hasOwn(m, 'license')) licenseFact = unknown('license_spdx_recognized', metadataSource, 'GitHub did not return licence classification.');
  else {
    const spdx = typeof m.license?.spdx_id === 'string' ? m.license.spdx_id : null;
    if (m.license !== null && spdx === null) licenseFact = unknown('license_spdx_recognized', metadataSource, 'GitHub licence object lacks a stable SPDX identifier.');
    else licenseFact = observed('license_spdx_recognized', !!spdx && !['NOASSERTION','OTHER','NONE'].includes(spdx.toUpperCase()), metadataSource, `GitHub classifier: ${spdx ?? 'none'}. Dual/custom licensing needs human review; this is not a licence-validity verdict.`);
  }
  const facts = [
    descriptionFact,
    ...(Array.isArray(m.topics) ? [observed('topics_present', m.topics.length > 0, metadataSource, 'Presence does not establish topic relevance.')] : [unknown('topics_present', metadataSource, 'GitHub response did not include a topics array.')]),
    homepageFact, visibilityFact, archiveFact, licenseFact,
    await requiredCheckFact(api, base, branch, branchInfo),
    ...await communityFacts(api, base, owner, branch),
  ];
  return { repository: meta.data.full_name, revision, observed_at: now.toISOString(), facts };
}

/** Compare a bounded documentation/configuration *sample*, never the full Git checkout.
 * No local file bytes or hashes are sent to GitHub; the request transmits only paths/ref.
 * localScan.blobShas holds hashes of exact bytes read, not decoded/normalised text.
 */
export async function compareGitHubFiles(name, revision, localScan, {
  fetchImpl, token = '', timeoutMs = 8000, maxFiles = 10,
} = {}) {
  repositoryName(name);
  if (!/^[0-9a-f]{40}$/i.test(revision ?? '')) return {
    status: 'unknown', revision: null, scope: 'selected documentation/configuration files',
    note: 'No verified remote default-branch commit SHA was available.', files: [],
  };
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 12) throw new Error('Remote comparison file limit must be between 1 and 12');
  const [owner, repo] = name.split('/');
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const api = new GitHubReader({ fetchImpl, token, timeoutMs, maxRequests: maxFiles });
  const priority = name => name === 'README.md' ? 0 : name === 'AGENTS.md' ? 1 : name === '.github/dependabot.yml' ? 2 :
    name === '.github/dependabot.yaml' ? 2 : /^\.github\/workflows\/[^/]+\.ya?ml$/.test(name) ? 3 :
    name === 'package.json' ? 4 : name === 'LICENSE' ? 5 : name === 'CONTRIBUTING.md' ? 6 :
    name === 'SECURITY.md' ? 7 : name === 'CODE_OF_CONDUCT.md' ? 8 : 20;
  const eligible = [...(localScan.blobShas?.keys() ?? [])].filter(p => priority(p) !== 20).sort((a,b) => priority(a) - priority(b) || a.localeCompare(b, 'en'));
  const sample = eligible.slice(0, maxFiles);
  const files = [];
  for (const file of sample) {
    // Input paths originate in the bounded local scanner; defend the API anyway.
    if (file.startsWith('/') || file.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('Invalid local comparison path');
    const endpoint = `${base}/contents/${file.split('/').map(encodeURIComponent).join('/')}?ref=${revision}`;
    const remote = await api.get(endpoint);
    if (!remote.ok) {
      files.push({ path: file, status: 'unknown', reason: reason(remote) });
      continue;
    }
    if (remote.data?.type !== 'file' || !/^[0-9a-f]{40}$/i.test(remote.data?.sha ?? '')) {
      files.push({ path: file, status: 'unknown', reason: 'GitHub response did not include a valid file blob SHA.' });
      continue;
    }
    const matches = remote.data.sha.toLowerCase() === localScan.blobShas.get(file)?.toLowerCase();
    files.push({ path: file, status: matches ? 'match' : 'mismatch', reason: matches ? 'Local file bytes match the remote Git blob SHA.' : 'Local file bytes differ from the remote Git blob SHA.' });
  }
  const mismatched = files.some(f => f.status === 'mismatch');
  const incomplete = eligible.length > sample.length || files.some(f => f.status === 'unknown');
  return {
    status: mismatched ? 'mismatch' : !files.length || files.every(f => f.status === 'unknown') ? 'unknown' : incomplete ? 'partial' : 'matching-sample',
    revision, scope: 'selected documentation/configuration files only; not a full tracked tree or dirty-state check',
    note: eligible.length > maxFiles ? `Selected first ${maxFiles} of ${eligible.length} eligible readable files; full checkout match is not proven.` : 'Only selected, readable text files were compared; full checkout match is not proven.',
    files,
  };
}
