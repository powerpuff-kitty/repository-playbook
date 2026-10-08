import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { snapshot } from '../src/scan.mjs';
import { compareGitHubFiles } from '../src/github.mjs';
import { audit, markdown } from '../src/audit.mjs';
import { readJson, validateSchema, HOME } from '../src/model.mjs';

const rev = 'a'.repeat(40);
const hash = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function fixture(t, files = { 'README.md': '# Hello\n' }) {
  const dir = await mkdtemp(path.join(tmpdir(), 'playbook-revision-'));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) await writeFile(path.join(dir, file), content);
  return { dir, scan: await snapshot(dir) };
}
function fake(pathToSha, overrides = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    const pathname = new URL(url).pathname;
    const file = decodeURIComponent(pathname.split('/contents/')[1] ?? '');
    const response = overrides[file] ?? (Object.hasOwn(pathToSha, file) ? { code: 200, body: { type: 'file', sha: pathToSha[file] } } : { code: 404, body: {} });
    return new Response(JSON.stringify(response.body), { status: response.code });
  };
  return { requests, fetchImpl };
}

test('scanner creates exact Git blob SHA for file bytes without reading .git', async t => {
  const raw = Buffer.from('# Euro €\n', 'utf8');
  const { scan } = await fixture(t, { 'README.md': raw });
  assert.equal(scan.blobShas.get('README.md'), hash(raw));
});
test('matching selected files are a sample, never a full verified checkout', async t => {
  const { dir, scan } = await fixture(t);
  const remote = fake({ 'README.md': scan.blobShas.get('README.md') });
  const match = await compareGitHubFiles('example/project', rev, scan, { fetchImpl: remote.fetchImpl, token: 'test-token' });
  assert.equal(match.status, 'matching-sample');
  assert.equal(match.files[0].status, 'match');
  assert.match(match.scope, /not a full/);
  assert.ok(remote.requests.every(r => r.options.method === 'GET' && r.options.redirect === 'error'));
  assert.ok(remote.requests.every(r => !r.url.includes('# Hello')));
  assert.ok(!JSON.stringify(match).includes('test-token'));
  const report = await audit(dir, { profile: 'documentation', scan, remoteComparison: match });
  assert.equal(report.revision, null);
  assert.equal(report.remote_file_comparison.status, 'matching-sample');
  const output = markdown(report);
  assert.match(output, /selected documentation\/configuration files/i);
  validateSchema(report, await readJson(path.join(HOME, 'schemas/report.schema.json')));
});
test('different remote Git SHA is reported as mismatch without sending local content', async t => {
  const { scan } = await fixture(t);
  const remote = fake({ 'README.md': '0'.repeat(40) });
  const result = await compareGitHubFiles('example/project', rev, scan, { fetchImpl: remote.fetchImpl });
  assert.equal(result.status, 'mismatch');
  assert.equal(result.files[0].status, 'mismatch');
});
test('missing access and malformed remote blob SHA remain unknown or partial', async t => {
  const { scan } = await fixture(t);
  const unavailable = await compareGitHubFiles('example/project', rev, scan, { fetchImpl: fake({}, { 'README.md': { code: 403, body: {} } }).fetchImpl });
  assert.equal(unavailable.status, 'unknown');
  assert.equal(unavailable.files[0].status, 'unknown');
  const malformed = await compareGitHubFiles('example/project', rev, scan, { fetchImpl: fake({}, { 'README.md': { code: 200, body: { sha: 'not-a-hash', type: 'file' } } }).fetchImpl });
  assert.equal(malformed.files[0].status, 'unknown');
});
test('revision matching never happens without a verified 40-digit SHA', async t => {
  const { scan } = await fixture(t);
  const result = await compareGitHubFiles('example/project', null, scan, { fetchImpl: () => { throw Error('no requests'); } });
  assert.equal(result.status, 'unknown');
  assert.deepEqual(result.files, []);
});
test('comparison is bounded and selected files are deterministic, not all repository files', async t => {
  const { scan } = await fixture(t, { 'README.md': '# Hi', 'AGENTS.md': 'Notes', 'LICENSE': 'MIT' });
  const remote = fake({ 'README.md': scan.blobShas.get('README.md') });
  const result = await compareGitHubFiles('example/project', rev, scan, { fetchImpl: remote.fetchImpl, maxFiles: 1 });
  assert.equal(remote.requests.length, 1);
  assert.equal(result.files[0].path, 'README.md');
  assert.equal(result.status, 'partial');
  await assert.rejects(compareGitHubFiles('example/project', rev, scan, { maxFiles: 500 }), /limit/);
});
test('CLI requires explicit GitHub option for remote comparison', () => {
  const run = args => spawnSync(process.execPath, [path.join(HOME, 'src/cli.mjs'), ...args], { encoding: 'utf8', timeout: 10000 });
  assert.equal(run(['--compare-remote']).status, 2);
  assert.match(run(['--help']).stdout, /--compare-remote/);
});
