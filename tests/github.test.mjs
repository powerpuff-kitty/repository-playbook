import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectGitHubFacts, GitHubReader, repositoryName } from '../src/github.mjs';
import { audit } from '../src/audit.mjs';
import { validateSchema, readJson, HOME } from '../src/model.mjs';

const fixedNow = new Date('2026-10-08T13:55:46Z');
const BASE = 'https://api.github.com/repos/example/project';
const META = { full_name: 'example/project', default_branch: 'main', description: 'Evidence-first guide', topics: ['documentation'] };
const BRANCH = { name: 'main', commit: { sha: 'a'.repeat(40) }, protected: true };
const CLASSIC = { required_status_checks: { contexts: ['quality'], checks: [] }, enforce_admins: { enabled: true } };
const emptyProfile = { files: { contributing: null, code_of_conduct_file: null } };

function status(code, data = {}, headers = {}) { return { code, data, headers }; }
function fakeApi(override = {}) {
  const requests = [];
  const defaults = {
    [`${BASE}`]: status(200, META),
    [`${BASE}/branches/main`]: status(200, BRANCH),
    [`${BASE}/branches/main/protection`]: status(200, CLASSIC),
    [`${BASE}/rules/branches/main?per_page=100`]: status(200, []),
    [`${BASE}/community/profile`]: status(200, emptyProfile),
    'https://api.github.com/repos/example/.github': status(404),
  };
  const routes = { ...defaults, ...override };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    const route = routes[url] ?? (url.includes('/contents/') ? status(404) : null);
    if (!route) throw Error(`Unexpected API target: ${url}`);
    return new Response(JSON.stringify(route.data), { status: route.code, headers: route.headers });
  };
  return { fetchImpl, requests };
}
const fact = (facts, key) => facts.facts.find(f => f.key === key);
async function rootFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'playbook-gh-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'README.md'), '# Example\n');
  return root;
}

test('GitHub repo identifier is not a URL, traversal path or malformed name', () => {
  for (const bad of ['https://github.com/a/b', '../secret', 'org/../', 'org/x.git', 'org/', 'a/b/c', 'foo/%2f', 'o/r?query=1', '', '.github']) assert.throws(() => repositoryName(bad));
  assert.equal(repositoryName('example/project'), 'example/project');
});
test('opt-in live facts include metadata, classic protection and exact evidence provenance', async t => {
  const mock = fakeApi({
    [`${BASE}/community/profile`]: status(200, { files: { contributing: { html_url: 'https://github.com/example/.github/blob/main/CONTRIBUTING.md' }, code_of_conduct_file: { html_url: 'https://github.com/example/project/blob/main/CODE_OF_CONDUCT.md' } } }),
    [`${BASE}/contents/.github/SECURITY.md?ref=main`]: status(200, { type: 'file', size: 120 }),
  });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl, now: fixedNow, token: 'fake-test-token' });
  validateSchema(facts, await readJson(path.join(HOME, 'schemas/facts.schema.json')));
  assert.equal(facts.revision, 'a'.repeat(40));
  assert.deepEqual(facts.facts.map(f => [f.key, f.status, f.value]), [
    ['description_present','observed',true], ['topics_present','observed',true],
    ['required_checks_enforced','observed',true], ['community.CONTRIBUTING.md','observed',true],
    ['community.CODE_OF_CONDUCT.md','observed',true], ['community.SECURITY.md','observed',true]
  ]);
  assert.ok(mock.requests.every(r => r.url.startsWith('https://api.github.com/repos/') && r.options.method === 'GET' && r.options.redirect === 'error'));
  assert.ok(mock.requests.every(r => r.options.headers.authorization === 'Bearer fake-test-token'));
  assert.ok(!JSON.stringify(facts).includes('fake-test-token'));
  const report = await audit(await rootFixture(t), { facts, factsKind: 'github-api', repository: 'example/project', now: fixedNow });
  assert.equal(report.source.mode, 'local+github-api');
  assert.equal(report.revision, null);
  assert.equal(report.source.facts_revision, facts.revision);
  assert.match(report.findings.find(f => f.rule_id === 'SEC-002').summary, /GitHub API/);
});
test('unprotected branch and complete active-rule check can fail policy without inventing enforcement', async () => {
  const mock = fakeApi({
    [`${BASE}/branches/main`]: status(200, { ...BRANCH, protected: false }),
    [`${BASE}/branches/main/protection`]: status(404),
    [`${BASE}`]: status(200, { ...META, description: '', topics: [] }),
  });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl, now: fixedNow });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'observed');
  assert.equal(fact(facts, 'required_checks_enforced').value, false);
  assert.equal(fact(facts, 'description_present').value, false);
  assert.equal(fact(facts, 'topics_present').value, false);
  assert.equal(fact(facts, 'community.SECURITY.md').status, 'unknown');
});
test('403 protection and rules cause unknown, not fabricated fail', async () => {
  const facts = await collectGitHubFacts('example/project', { fetchImpl: fakeApi({
    [`${BASE}/branches/main/protection`]: status(403),
    [`${BASE}/rules/branches/main?per_page=100`]: status(403),
  }).fetchImpl, now: fixedNow });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
});
test('classic required checks with possible admin bypass remain unknown', async () => {
  const facts = await collectGitHubFacts('example/project', { fetchImpl: fakeApi({
    [`${BASE}/branches/main/protection`]: status(200, { ...CLASSIC, enforce_admins: { enabled: false } }),
  }).fetchImpl });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
});
test('active ruleset with explicit no bypass can satisfy required checks', async () => {
  const mock = fakeApi({
    [`${BASE}/branches/main/protection`]: status(404),
    [`${BASE}/rules/branches/main?per_page=100`]: status(200, [{ type: 'required_status_checks', ruleset_id: 42, parameters: { required_status_checks: [{ context: 'quality' }] } }]),
    [`${BASE}/rulesets/42?includes_parents=true`]: status(200, { enforcement: 'active', bypass_actors: [], target: 'branch' }),
  });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl });
  assert.equal(fact(facts, 'required_checks_enforced').value, true);
  assert.match(fact(facts, 'required_checks_enforced').source, /rulesets\/42/);
});
test('a ruleset with omitted or populated bypass actors is not a demonstrated pass', async () => {
  for (const detail of [{ enforcement: 'active' }, { enforcement: 'active', bypass_actors: [{ actor_type: 'Team', bypass_mode: 'always' }] }]) {
    const facts = await collectGitHubFacts('example/project', { fetchImpl: fakeApi({
      [`${BASE}/branches/main/protection`]: status(404),
      [`${BASE}/rules/branches/main?per_page=100`]: status(200, [{ type: 'required_status_checks', ruleset_id: 42, parameters: { required_status_checks: [{ context: 'quality' }] } }]),
      [`${BASE}/rulesets/42?includes_parents=true`]: status(200, detail),
    }).fetchImpl });
    assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
  }
});
test('ruleset pagination includes results from later pages without following arbitrary URLs', async () => {
  const first = `${BASE}/rules/branches/main?per_page=100`;
  const second = `${BASE}/rules/branches/main?per_page=100&page=2`;
  const mock = fakeApi({
    [`${BASE}/branches/main/protection`]: status(404),
    [first]: status(200, [{ type: 'pull_request', ruleset_id: 2 }], { Link: `<${second}>; rel="next"` }),
    [second]: status(200, [{ type: 'required_status_checks', ruleset_id: 42, parameters: { required_status_checks: [{ context: 'CI' }] } }]),
    [`${BASE}/rulesets/42?includes_parents=true`]: status(200, { enforcement: 'active', bypass_actors: [] }),
  });
  assert.equal(fact(await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl }), 'required_checks_enforced').status, 'observed');
  assert.ok(mock.requests.some(r => r.url === second));
});
test('malicious Link header is rejected without making an untrusted request', async () => {
  const first = `${BASE}/rules/branches/main?per_page=100`;
  const mock = fakeApi({
    [`${BASE}/branches/main/protection`]: status(404),
    [first]: status(200, [], { Link: '<https://evil.example/steal?page=2>; rel="next"' }),
  });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
  assert.ok(!mock.requests.some(r => r.url.includes('evil.example')));
});
test('rate limits are not retried and retain unknown result', async () => {
  const mock = fakeApi({ [`${BASE}/rules/branches/main?per_page=100`]: status(403, {}, { 'x-ratelimit-remaining': '0' }), [`${BASE}/branches/main/protection`]: status(404) });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
  assert.match(fact(facts, 'required_checks_enforced').reason, /rate limit/);
});
test('public owner .github repository can supply inherited community defaults', async () => {
  const base = 'https://api.github.com/repos/example/.github';
  const mock = fakeApi({
    [base]: status(200, { full_name: 'example/.github', private: false, default_branch: 'main' }),
    [`${base}/contents/.github/CONTRIBUTING.md?ref=main`]: status(200, { type: 'file', size: 112 }),
    [`${base}/contents/.github/CODE_OF_CONDUCT.md?ref=main`]: status(200, { type: 'file', size: 300 }),
    [`${base}/contents/.github/SECURITY.md?ref=main`]: status(200, { type: 'file', size: 200 }),
  });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: mock.fetchImpl });
  for (const filename of ['CONTRIBUTING.md','CODE_OF_CONDUCT.md','SECURITY.md']) {
    assert.equal(fact(facts, `community.${filename}`).value, true);
    assert.match(fact(facts, `community.${filename}`).source, /example\/\.github/);
  }
});
test('community metrics can verify absent contribution/conduct but cannot prove missing security', async () => {
  const facts = await collectGitHubFacts('example/project', { fetchImpl: fakeApi().fetchImpl });
  assert.equal(fact(facts, 'community.CONTRIBUTING.md').value, false);
  assert.equal(fact(facts, 'community.CODE_OF_CONDUCT.md').value, false);
  assert.equal(fact(facts, 'community.SECURITY.md').status, 'unknown');
});
test('oversized response or exhausted request budget is not interpreted as negative evidence', async () => {
  const tooBig = fakeApi({ [`${BASE}/branches/main/protection`]: status(200, { very_large: 'x'.repeat(1024*1024) }) });
  const facts = await collectGitHubFacts('example/project', { fetchImpl: tooBig.fetchImpl, maxRequests: 8 });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
});
test('network redirect error does not expose tokens, retry or make writes', async () => {
  const mock = fakeApi();
  const fetchImpl = async (url, opts) => {
    if (url.endsWith('/branches/main/protection')) throw new Error('secret-placeholder');
    return mock.fetchImpl(url, opts);
  };
  const facts = await collectGitHubFacts('example/project', { fetchImpl, token: 'super-private-string' });
  assert.equal(fact(facts, 'required_checks_enforced').status, 'unknown');
  assert.ok(!JSON.stringify(facts).includes('super-private-string'));
});
test('GitHubReader rejects endpoint escape and caps request count', async () => {
  const mock = fakeApi(); const reader = new GitHubReader({ fetchImpl: mock.fetchImpl, maxRequests: 1 });
  await assert.rejects(reader.get('https://evil.example/'), /Disallowed/);
  assert.equal((await reader.get('/repos/example/project')).ok, true);
  assert.match((await reader.get('/repos/example/project')).error, /budget/);
});
test('CLI refuses incompatible sources and identifiers before network access', () => {
  const run = args => spawnSync(process.execPath, [path.join(HOME, 'src/cli.mjs'), ...args], { encoding: 'utf8', timeout: 2000 });
  assert.equal(run(['--github', 'example/project', '--facts', 'facts.json']).status, 2);
  assert.equal(run(['--github', 'example/project', '--repository', 'other/repo']).status, 2);
  assert.equal(run(['--github', 'https://github.com/example/project']).status, 2);
  const help = run(['--help']); assert.equal(help.status, 0); assert.match(help.stdout, /--github OWNER\/REPO/);
});
