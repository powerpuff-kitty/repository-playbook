import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { audit, markdown, dimensionSummary, DIMENSIONS } from '../src/audit.mjs';
import { readmeFirstScreen, imagePresentation, placeholderReview } from '../src/presentation.mjs';
import { readJson, validateSchema, HOME } from '../src/model.mjs';

const scan = (files, skipped=[]) => ({ files: new Map(Object.entries(files)), skipped });
const now = new Date('2026-10-08T16:15:00Z');
const key = (report, id) => report.findings.find(f => f.rule_id === id);
async function fixture(t, files={}) {
  const dir=await mkdtemp(path.join(tmpdir(), 'playbook-presentation-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  for (const [filename, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir,filename)),{recursive:true});
    await writeFile(path.join(dir,filename),content);
  }
  return dir;
}
function facts(changes=[]) {
  return { repository:'example/project', revision:'a'.repeat(40), observed_at:now.toISOString(), facts:changes.map(([key,value,status='observed'])=>({key,status,value,source:'https://api.github.com/repos/example/project'})) };
}

test('first screen is a narrow title and introduction check, not rendered layout validation', () => {
  const input=scan({'README.md':'# Small project\n\n[![CI](https://img.shields.io/badge/CI-green)](https://github.com/x/y)\n\n> A compact library for working with Markdown files.\n\n## Install\nDo things.'});
  const result=readmeFirstScreen(input);
  assert.equal(result.status,'pass');assert.match(result.summary,/rendering still require review/);
});
test('link-only navigation and image badges do not count as an introduction', () => {
  const input=scan({'README.md':'# Small project\n\n[![CI](https://img.shields.io/badge/CI-green)](https://github.com/x/y)\n[Docs](docs.md) · [Demo](https://example.com)\n\n## Install'});
  assert.equal(readmeFirstScreen(input).status,'manual-review');
});
test('alternative heading styles are manual review, not a fabricated fail', () => {
  assert.equal(readmeFirstScreen(scan({'README.md':'Project\n=======\n\nAn example without an ATX heading.'})).status,'manual-review');
  assert.equal(readmeFirstScreen(scan({})).status,'unknown');
});
test('badge-only README images do not create screenshot requirements', () => {
  assert.equal(imagePresentation(scan({'README.md':'# Project\n[![CI](https://img.shields.io/badge/CI-pass)](https://example.com)'})).status,'not-applicable');
});
test('non-badge screenshot with empty alt is review; decorative intent remains possible', () => {
  const result=imagePresentation(scan({'README.md':'# Example\n![ ](assets/screen.png)'}));
  assert.equal(result.status,'manual-review');assert.match(result.evidence[1].observation,/[Dd]ecorative/);
});
test('well-labelled README and HTML images only pass the syntax check', () => {
  const result=imagePresentation(scan({'README.md':'![Editor showing a map](assets/editor.png)\n<img src="chart.png" alt="Chart of daily users">'}));
  assert.equal(result.status,'pass');assert.match(result.summary,/not verified/);
});
test('unknown images in fenced examples are ignored', () => {
  const r=imagePresentation(scan({'README.md':'```md\n![](example.png)\n```'}));assert.equal(r.status,'not-applicable');
});
test('scan gaps never produce an image pass', () => {
  const r=imagePresentation(scan({'README.md':null},[{path:'docs/example.md',reason:'size-limit'}]));assert.equal(r.status,'unknown');
});
test('README placeholders are review signals, never strict failures', () => {
  assert.equal(placeholderReview(scan({'README.md':'# App\nTODO: update installation\n'})).status,'manual-review');
  assert.equal(placeholderReview(scan({'README.md':'# App\nWe handle TODOs in source documents.\n'})).status,'pass');
  assert.equal(placeholderReview(scan({'README.md':'# App\n```\nTODO: example\n```\n'})).status,'pass');
  assert.equal(placeholderReview(scan({})).status,'unknown');
});
test('GitHub licence Other, absent homepage and private status are reviews, not automatic fails', async t => {
  const root=await fixture(t, {'README.md':'# Project\n\nA concise catalogue for embedded systems.','LICENSE':'MIT License here'});
  const report=await audit(root,{profile:'catalogue', now, facts:facts([
    ['homepage_present',false],['license_spdx_recognized',false],['repository_public',false],['repository_archived',false],
  ]),factsKind:'github-api'});
  for (const id of ['DISC-003','DISC-004','DISC-005','DISC-006']) assert.equal(key(report,id).status,'manual-review',id);
  assert.equal(key(report,'REL-001').status,'pass');
  assert.equal(key(report,'DISC-001').status,'unknown');
});
test('recognized SPDX and homepage prove only metadata classification and presence', async t => {
  const root=await fixture(t,{'README.md':'# Project\n\nA public tool that provides current information.'});
  const report=await audit(root,{now,facts:facts([['homepage_present',true],['license_spdx_recognized',true]])});
  assert.equal(key(report,'DISC-003').status,'pass');
  assert.equal(key(report,'DISC-005').status,'pass');
  assert.match(key(report,'DISC-005').summary,/Scope is limited/);
});
test('stale facts stay unknown even for advisory settings', async t => {
  const root=await fixture(t,{'README.md':'# App'});
  const f=facts([['homepage_present',true]]); f.observed_at='2025-01-01T00:00:00Z';
  const report=await audit(root,{now,facts:f});assert.equal(key(report,'DISC-003').status,'unknown');
});
test('dimension matrix is exhaustive, disjoint, profile-specific, and never a completion score', async t => {
  const root=await fixture(t,{'README.md':'# Project\n\nA short guide to getting started.'});
  const report=await audit(root,{now});
  const dims=report.dimensions;
  assert.deepEqual(Object.keys(dims),['presentation','visibility','completeness','engineering']);
  assert.equal(Object.values(dims).reduce((sum,d)=>sum+d.rules.length,0),report.findings.length);
  assert.equal(Object.values(dims).reduce((sum,d)=>sum+d.applicable,0),report.coverage.applicable);
  assert.ok(dims.presentation.rules.includes('PRES-001'));
  assert.ok(dims.visibility.rules.includes('DISC-005'));
  assert.ok(dims.completeness.rules.includes('COMP-002'));
  assert.ok(!('score' in report));
  assert.match(markdown(report),/## Presentation, visibility and completeness/);
  assert.match(markdown(report),/not a quality or completion percentage/);
  validateSchema(report,await readJson(path.join(HOME,'schemas/report.schema.json')));
});
