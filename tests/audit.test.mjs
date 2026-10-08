import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { audit, evaluate, markdown } from '../src/audit.mjs';
import { snapshot, localLinks, headingIds, stripCode } from '../src/scan.mjs';
import { loadModel, validateSchema, readJson, HOME } from '../src/model.mjs';

const now = new Date('2026-10-08T13:00:00Z');
async function fixture(t, files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'playbook-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(path.dirname(path.join(root, name)), { recursive: true }); await writeFile(path.join(root, name), text); }
  return root;
}
const get = (report, id) => report.findings.find(f => f.rule_id === id);
const map = files => new Map(Object.entries(files));
const facts = (key, value, status = 'observed') => ({ repository: 'example/project', revision: null, observed_at: now.toISOString(), facts: [{ key, value, status, source: 'https://api.github.com/repos/example/project' }] });
const run = args => spawnSync(process.execPath, [path.join(HOME, 'src/cli.mjs'), ...args], { encoding: 'utf8', timeout: 10000 });

test('catalogue has 53 unique rules and four profiles', async () => {
  const m = await loadModel(); assert.equal(m.rules.length, 53); assert.equal(m.profiles.length, 4); assert.equal(new Set(m.rules.map(r => r.id)).size, 53);
});
test('empty repository: narrow failures, unknown defaults/settings, no invented score', async t => {
  const r = await audit(await fixture(t), { now });
  assert.equal(get(r, 'DOC-001').status, 'fail'); assert.equal(get(r, 'SEC-002').status, 'unknown'); assert.equal(get(r, 'COMM-001').status, 'unknown'); assert.equal(get(r, 'CAT-001').status, 'not-applicable'); assert.equal(r.score, undefined); assert.equal(r.revision, null);
});
test('nonempty file presence does not prove content quality', async t => {
  const r = await audit(await fixture(t, { 'README.md': '# Example', 'LICENSE': 'Example licence fixture' }), { now });
  assert.equal(get(r, 'DOC-001').status, 'pass'); assert.equal(get(r, 'DOC-002').status, 'manual-review'); assert.equal(get(r, 'REL-001').status, 'pass');
});
test('blank required files fail presence checks', async t => {
  const r = await audit(await fixture(t, { 'README.md': ' \n' }), { now }); assert.equal(get(r, 'DOC-001').status, 'fail');
});
test('GitHub README precedence uses .github before root', async t => {
  const r = await audit(await fixture(t, { '.github/README.md': '# Custom', 'README.md': '[ci](https://img.shields.io/github/actions/workflow/status/o/r/c.yml)' }), { now });
  assert.equal(get(r, 'DOC-006').status, 'not-applicable');
});
test('profile applicability does not penalise documentation for deployments', async t => {
  const root = await fixture(t); const doc = await audit(root, { now }); const app = await audit(root, { now, profile: 'application' });
  assert.equal(get(doc, 'APP-001').status, 'not-applicable'); assert.equal(get(app, 'APP-001').status, 'manual-review');
});
test('unknown profile is rejected', async t => { await assert.rejects(audit(await fixture(t), { profile: 'invented' }), /Unknown profile/); });
test('required checks remain unknown without usable evidence', async t => {
  const root = await fixture(t); const f = facts('required_checks_enforced', true, 'unknown');
  assert.equal(get(await audit(root, { now, facts: f }), 'SEC-002').status, 'unknown');
});
test('observed settings report supplied provenance without matching local revision', async t => {
  const f = facts('required_checks_enforced', true); f.revision = 'abc';
  const r = await audit(await fixture(t), { now, facts: f });
  assert.equal(get(r, 'SEC-002').status, 'pass'); assert.match(get(r, 'SEC-002').summary, /Not independently verified/); assert.equal(r.revision, null); assert.equal(r.source.facts_revision, 'abc');
});
test('old and future facts do not become passes', async t => {
  const root = await fixture(t); for (const date of ['2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z']) {
    const f = facts('required_checks_enforced', true); f.observed_at = date;
    assert.equal(get(await audit(root, { now, facts: f }), 'SEC-002').status, 'unknown');
  }
});
test('inherited community file can be supplied without local presence', async t => {
  const r = await audit(await fixture(t), { now, facts: facts('community.CONTRIBUTING.md', true) }); assert.equal(get(r, 'COMM-001').status, 'pass');
});
test('malformed facts and extra fields are rejected', async t => {
  const root = await fixture(t); const f = facts('topics_present', 'yes'); await assert.rejects(audit(root, { now, facts: f }), /expected boolean/);
  f.facts[0].value = true; f.secret = 'not accepted'; await assert.rejects(audit(root, { now, facts: f }), /unexpected property/);
});
test('simple local links, images and references resolve', () => {
  const r = localLinks(map({ 'README.md': '[guide](docs/a.md) ![img](a.png) [ref][g]\n[g]: docs/a.md', 'docs/a.md': '# Start', 'a.png': null })); assert.deepEqual(r.broken, []); assert.equal(r.inspected, 2);
});
test('missing local targets and undefined references fail', () => {
  assert.equal(localLinks(map({ 'README.md': '[missing](no.md) [wrong][id]' })).broken.length, 2);
});
test('code-fenced examples and comments are ignored', () => {
  const r = localLinks(map({ 'README.md': '```md\n[x](missing)\n```\n<!-- [x](missing2) -->' })); assert.equal(r.inspected, 0); assert.deepEqual(r.broken, []);
});
test('tilde fences and inline code are stripped', () => { assert.equal(stripCode('~~~\nsecret\n~~~\n`inline`').includes('secret'), false); });
test('path traversal is not resolved outside the target', () => { assert.match(localLinks(map({ 'README.md': '[escape](../secret.md)' })).broken[0], /escapes/); });
test('invalid encoding is a finding, not a crash', () => { assert.equal(localLinks(map({ 'README.md': '[x](%ZZ)' })).broken.length, 1); });
test('GitHub root-relative URLs are deferred, not called missing', () => { const r = localLinks(map({ 'README.md': '[x](/docs/a.md)' })); assert.equal(r.broken.length, 0); assert.equal(r.deferred.length, 1); });
test('unresolved headings and complex HTML need manual review', () => {
  const r = localLinks(map({ 'README.md': '[x](#absent)\n<a href="x">x</a>' })); assert.equal(r.broken.length, 0); assert.ok(r.deferred.length >= 2);
});
test('duplicate simple headings receive suffixes', () => { assert.deepEqual([...headingIds('# Intro\n## Intro\n# Café')], ['intro','intro-1','café']); });
test('templates and external URLs are outside local target validation', () => {
  const r = localLinks(map({ 'templates/x.md': '[x](future.md)', 'README.md': '[x](https://example.invalid)' })); assert.equal(r.broken.length, 0); assert.equal(r.inspected, 0);
});
test('workflow badge scope is policy, not network verification', async t => {
  const { rules } = await loadModel(); const rule = rules.find(r => r.id === 'DOC-006');
  const scan = text => ({ files: map({ 'README.md': text }), skipped: [] });
  assert.equal(evaluate(rule, scan('[ci](https://img.shields.io/github/actions/workflow/status/a/b/ci.yml)')).status, 'fail');
  assert.equal(evaluate(rule, scan('[ci](https://img.shields.io/github/actions/workflow/status/a/b/ci.yml?branch=main&event=push)')).status, 'pass');
  assert.equal(evaluate(rule, scan('# No badges')).status, 'not-applicable');
});
test('symlinks are skipped and never treated as readable required files', async t => {
  const root = await fixture(t); const outside = await fixture(t, { 'README.md': 'outside' });
  await symlink(path.join(outside, 'README.md'), path.join(root, 'README.md'));
  const r = await audit(root, { now }); assert.equal(get(r, 'DOC-001').status, 'unknown'); assert.ok(r.exclusions.some(x => x.reason === 'symlink'));
});
test('large text reads are bounded', async t => {
  const root = await fixture(t, { 'README.md': 'a'.repeat(512 * 1024 + 1) }); const scan = await snapshot(root); assert.equal(scan.files.get('README.md'), null); assert.ok(scan.skipped.some(x => x.reason === 'size-limit'));
});
test('node_modules, .git and .env contents are not read', async t => {
  const scan = await snapshot(await fixture(t, { 'node_modules/x.md': 'secret', '.git/config': 'secret', '.env': 'TOKEN=fixture' })); assert.equal(scan.files.has('node_modules/x.md'), false); assert.equal(scan.files.has('.git/config'), false); assert.equal(scan.files.get('.env'), null);
});
test('audit does not execute package scripts or mutate target content', async t => {
  const root = await fixture(t, { 'package.json': '{"scripts":{"test":"never execute"}}', 'README.md': '# Safe' });
  const before = await readFile(path.join(root, 'package.json'), 'utf8'); await audit(root, { now }); assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), before);
});
test('same stable content produces the same digest and counts', async t => {
  const root = await fixture(t, { 'README.md': '# Consistent' }); const a = await audit(root, { now }); const b = await audit(root, { now }); assert.equal(a.files_digest, b.files_digest); assert.deepEqual(a.counts, b.counts);
});
test('reports validate and escape Markdown/HTML content', async t => {
  const r = await audit(await fixture(t, { 'README.md': '[bad](missing.md)' }), { now }); validateSchema(r, await readJson(path.join(HOME, 'schemas/report.schema.json')));
  r.findings[0].summary = '<script>alert(1)</script>|[link]'; assert.ok(!markdown(r).includes('<script>')); assert.ok(markdown(r).includes('&#124;'));
});
test('schema implementation rejects unknown keywords and wrong values', () => {
  assert.throws(() => validateSchema({}, { allOf: [] }), /Unsupported/); assert.throws(() => validateSchema(1.5, { type: 'integer' }), /expected/); assert.throws(() => validateSchema(['x','x'], { type: 'array', uniqueItems: true }), /duplicates/);
});
test('CLI has strict errors and explicit gating', async t => {
  const root = await fixture(t);
  assert.equal(run([root, '--format', 'json']).status, 0);
  assert.equal(run([root, '--fail-on', 'high']).status, 1);
  assert.equal(run([root, '--surprise']).status, 2);
  assert.equal(run([root, '--format', 'xml']).status, 2);
  assert.equal(run([root, '--fail-on', 'maybe']).status, 2);
  assert.equal(run([root, 'extra']).status, 2);
  assert.match(run(['--help']).stdout, /No target commands/);
});
test('CLI rejects mismatched explicit and snapshot identities', async t => {
  const root = await fixture(t, { 'facts.json': JSON.stringify(facts('topics_present', true)) });
  assert.equal(run([root, '--facts', path.join(root, 'facts.json'), '--repository', 'other/project']).status, 2);
});
test('duplicate observations are rejected instead of selecting a convenient value', async t => {
  const f = facts('required_checks_enforced', true); f.facts.push({ ...f.facts[0], value: false });
  await assert.rejects(audit(await fixture(t), { now, facts: f }), /Duplicate fact/);
});
test('bounded link checking preserves partial scope', () => {
  const files = map({ 'README.md': Array.from({ length: 20005 }, (_, i) => `[x](a.md?q=${i})`).join('\n'), 'a.md': '# Target' });
  const result = localLinks(files); assert.equal(result.inspected, 20000); assert.ok(result.deferred.some(s => s.includes('budget')));
});
test('CLI rejects oversized facts before parsing', async t => {
  const root = await fixture(t, { 'facts.json': 'a'.repeat(1024 * 1024 + 1) });
  assert.equal(run([root, '--facts', path.join(root, 'facts.json')]).status, 2);
});
test('invalid observation time remains unknown', async t => {
  const f = facts('required_checks_enforced', true); f.observed_at = '2026-99-99T00:00:00Z';
  const result = await audit(await fixture(t), { now, facts: f }); assert.equal(get(result, 'SEC-002').status, 'unknown');
});
