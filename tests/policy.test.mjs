import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowSecurity, dependencyCoverage, parseDependabot, dependencyManifests, yamlLines } from '../src/policy.mjs';

const scan = (files = {}, skipped = []) => ({ files: new Map(Object.entries(files)), skipped });
const SHA = '0123456789abcdef0123456789abcdef01234567';
const security = raw => workflowSecurity(scan({ '.github/workflows/ci.yml': raw }));
const dep = (files, skipped = []) => dependencyCoverage(scan(files, skipped));
const dependabot = (entries, extras = '') => `version: 2\nupdates:\n${entries.map(([ecosystem,directory]) => `  - package-ecosystem: "${ecosystem}"\n    directory: "${directory}"\n    schedule:\n      interval: "weekly"`).join('\n')}\n${extras}`;

// Workflow static checks intentionally don't assert complete security.
test('pinned external workflow with least privilege passes the *narrow* static check', () => {
  const result = security(`name: test\non: push\npermissions: { contents: read }\njobs:\n  ci:\n    steps:\n      - uses: actions/checkout@${SHA}\n      - uses: ./.github/actions/local\n`);
  assert.equal(result.status, 'pass');
  assert.match(result.summary, /other workflow threats are not checked/);
});
test('unpinned remote action refs are explicit failures', () => {
  const result = security('on: push\npermissions: read-all\nsteps:\n  - uses: actions/checkout@v4');
  assert.equal(result.status, 'fail');
  assert.match(result.evidence[0].observation, /Mutable/);
});
test('write-all permission at job or workflow scope fails', () => {
  assert.equal(security('permissions: write-all\nsteps:\n  - uses: ./local').status, 'fail');
  assert.equal(security('jobs:\n  upload:\n    permissions: "write-all"').status, 'fail');
});
test('commands embedded inside run YAML literal blocks are not interpreted as Action references', () => {
  const result = security(`permissions: read-all\nsteps:\n  - run: |\n      echo 'uses: example/evil@v1'\n      uses: example/evil@v1\n`);
  assert.equal(result.status, 'pass');
});
test('privileged pull_request_target is conservatively manual-review', () => {
  assert.equal(security(`on:\n  pull_request_target:\npermissions: contents: read\nsteps:\n  - uses: example/tool@${SHA}`).status, 'manual-review');
});
test('dynamic, aliased, and Docker references require review rather than a false pass', () => {
  assert.equal(security('permissions: read-all\nsteps:\n  - uses: ${{ inputs.action }}').status, 'manual-review');
  assert.equal(security('permissions: *token_perms\nsteps:\n  - uses: ./local').status, 'manual-review');
  assert.equal(security('permissions: read-all\nsteps:\n  - uses: docker://alpine:3').status, 'manual-review');
});
test('empty, skipped, or absent workflows cannot become security passes', () => {
  assert.equal(workflowSecurity(scan()).status, 'not-applicable');
  assert.notEqual(workflowSecurity(scan({ '.github/workflows/ci.yml': null })).status, 'pass');
  assert.equal(workflowSecurity(scan({}, [{ path: '.github/workflows/ci.yml', reason: 'size-limit' }])).status, 'unknown');
});
test('yaml subset reports complex aliases but skips comments', () => {
  const y = yamlLines('  # uses: evil/a@v1\npermissions: read-all\n- run: >-\n    uses: evil/a@v1');
  assert.ok(!y.lines.some(l => l.text.includes('evil/a')));
});

test('nested npm dependencies without a matching nested updater fail', () => {
  const result = dep({
    'package.json': JSON.stringify({ dependencies: { zod: '^3.0.0' } }),
    'mcp/package.json': JSON.stringify({ dependencies: { '@modelcontextprotocol/sdk': '^1.0.0' } }),
    '.github/dependabot.yml': dependabot([['npm','/']]),
  });
  assert.equal(result.status, 'fail');
  assert.ok(result.evidence.some(e => e.location === 'mcp/package.json'));
});
test('both npm paths and github-actions coverage pass with checked-in config', () => {
  const result = dep({
    'package.json': JSON.stringify({ devDependencies: { tsx: '4.0.0' } }),
    'mcp/package.json': JSON.stringify({ dependencies: { zod: '3.0.0' } }),
    '.github/workflows/ci.yml': `permissions: read-all\nsteps:\n  - uses: actions/checkout@${SHA}`,
    '.github/dependabot.yml': dependabot([['npm','/'],['npm','/mcp'],['github-actions','/']]),
  });
  assert.equal(result.status, 'pass');
});
test('GitHub Action updater must use slash root, not workflow directory', () => {
  const result = dep({ '.github/workflows/ci.yml': `permissions: read-all\nsteps:\n  - uses: actions/checkout@${SHA}`, '.github/dependabot.yml': dependabot([['github-actions','/.github/workflows']]) });
  assert.equal(result.status, 'fail');
});
test('config with directories list covers multi-directory packages', () => {
  const config = 'version: 2\nupdates:\n  - package-ecosystem: npm\n    directories:\n      - "/"\n      - "/mcp"\n    schedule:\n      interval: weekly';
  assert.equal(dep({ 'package.json': '{"dependencies":{"a":"1"}}', 'mcp/package.json': '{"dependencies":{"b":"1"}}', '.github/dependabot.yml': config }).status, 'pass');
});
test('invalid YAML / missing required schedule never masquerades as covered', () => {
  assert.equal(dep({ 'package.json': '{"dependencies":{"a":"1"}}', '.github/dependabot.yml': 'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /' }).status, 'manual-review');
  assert.equal(parseDependabot('version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /').uncertain, true);
});
test('disabled Dependabot PRs cannot count as an enabled updater', () => {
  const config = dependabot([['npm','/']], '    open-pull-requests-limit: 0\n');
  assert.equal(dep({ 'package.json': '{"dependencies":{"a":"1"}}', '.github/dependabot.yml': config }).status, 'fail');
});
test('malformed manifest and missing updater defer rather than make unsupported assumptions', () => {
  assert.equal(dep({ 'package.json': '{bad', '.github/dependabot.yml': dependabot([['npm','/']]) }).status, 'manual-review');
  assert.equal(dep({ 'package.json': '{"dependencies":{"a":"1"}}' }).status, 'manual-review');
});
test('no remote dependencies yields not-applicable, without penalising dependency-free package files', () => {
  assert.equal(dep({ 'package.json': '{"name":"fixture","private":true}', '.github/dependabot.yml': dependabot([['github-actions','/']]) }).status, 'not-applicable');
});
test('Cargo and pip manifests detect external requirements but not empty tables', () => {
  const found = dependencyManifests(scan({ 'rust/Cargo.toml': '[package]\nname="x"\n[dependencies]\nserde = "1"', 'src/pyproject.toml': '[project]\ndependencies = [\n  "requests>=2",\n]', 'empty/Cargo.toml': '[dependencies]\n# none' }));
  assert.ok(found.manifests.some(m => m.file === 'rust/Cargo.toml'));
  assert.ok(found.manifests.some(m => m.file === 'src/pyproject.toml'));
  assert.ok(!found.manifests.some(m => m.file === 'empty/Cargo.toml'));
});
