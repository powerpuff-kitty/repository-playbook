import { createHash } from 'node:crypto';
import { snapshot, localLinks, stripCode } from './scan.mjs';
import { loadModel, STATES, HOME, readJson, validateSchema } from './model.mjs';
import path from 'node:path';
import { workflowSecurity, dependencyCoverage } from './policy.mjs';
import { readmeFirstScreen, imagePresentation, placeholderReview } from './presentation.mjs';

const finding = (status, summary, evidence = []) => ({ status, summary, evidence });
const E = (location, observation) => ({ location, observation });
const readmePath = files => ['.github/README.md', 'README.md', 'readme.md', 'docs/README.md'].find(p => files.has(p));

function suppliedFact(key, facts, now, maxAgeDays, factsKind = 'supplied', mode = 'strict') {
  if (!facts) return finding('unknown', 'GitHub settings were not inspected; provide a dated facts snapshot.');
  const age = now.getTime() - Date.parse(facts.observed_at);
  if (!Number.isFinite(age) || age < -300000 || age > maxAgeDays * 86400000) return finding('unknown', 'Facts snapshot is expired or has an invalid/future timestamp.');
  const fact = facts.facts.find(f => f.key === key);
  if (!fact || fact.status === 'unknown') return finding('unknown', fact?.reason ?? `No observation for ${key}.`, fact?.source ? [E(fact.source, `Observed ${facts.observed_at}; incomplete evidence for ${key}.`)] : []);
  const status = mode === 'context' ? 'manual-review' : mode === 'advisory' && !fact.value ? 'manual-review' : fact.value ? 'pass' : 'fail';
  const description = factsKind === 'github-api' ? `GitHub API reports ${key} = ${fact.value}.` : `Supplied observation: ${key} = ${fact.value}; Not independently verified.`;
  const qualification = mode === 'context' ? 'Intended visibility/lifecycle policy cannot be inferred from metadata.' :
    mode === 'advisory' && !fact.value ? 'This is a review signal, not an automatic defect or legal conclusion.' :
    'Scope is limited to the named presence/classification check.';
  return finding(status, `${description} ${qualification}`, [E(fact.source, `Observed ${facts.observed_at}; ${factsKind === 'github-api' ? 'read-only live GitHub response' : 'caller-supplied snapshot'}.${fact.reason ? ' ' + fact.reason : ''}`)]);
}

export function evaluate(rule, scan, options = {}) {
  const { files, skipped } = scan;
  const now = options.now ?? new Date();
  const p = readmePath(files);
  const text = p ? files.get(p) : null;
  switch (rule.check) {
    case 'manual':
      return finding('manual-review', rule.review, (rule.paths ?? []).filter(p => files.has(p)).map(p => E(p, 'File exists; contents require human review.')));
    case 'setting': return suppliedFact(rule.fact, options.facts, now, options.maxAgeDays ?? 30, options.factsKind);
    case 'setting-advisory': return suppliedFact(rule.fact, options.facts, now, options.maxAgeDays ?? 30, options.factsKind, 'advisory');
    case 'setting-context': return suppliedFact(rule.fact, options.facts, now, options.maxAgeDays ?? 30, options.factsKind, 'context');
    case 'readme-first-screen': return readmeFirstScreen(scan);
    case 'image-presentation': return imagePresentation(scan);
    case 'placeholder-review': return placeholderReview(scan);
    case 'file':
    case 'community': {
      const found = rule.paths.find(p => typeof files.get(p) === 'string' && files.get(p).trim().length);
      if (found) return finding('pass', 'A nonempty file exists; this is a presence check, not a content-quality assessment.', [E(found, 'Nonempty file.')]);
      if (rule.check === 'community') return suppliedFact(`community.${rule.paths[0]}`, options.facts, now, options.maxAgeDays ?? 30, options.factsKind);
      if (skipped.length) return finding('unknown', 'Expected file not observed, but the bounded scan was incomplete.');
      return finding('fail', `No nonempty file found at: ${rule.paths.join(', ')}.`, rule.paths.map(p => E(p, files.has(p) ? 'Empty or unreadable.' : 'Not found.')));
    }
    case 'workflow-security': return workflowSecurity(scan);
    case 'dependency-coverage': return dependencyCoverage(scan);
    case 'workflow': {
      const paths = [...files.keys()].filter(p => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p));
      if (paths.some(p => files.get(p)?.trim())) return finding('pass', 'Workflow file found. Execution, syntax and branch enforcement are separate checks.', paths.map(p => E(p, 'Workflow path.')));
      return finding(skipped.length ? 'unknown' : 'fail', 'No nonempty GitHub workflow file observed.');
    }
    case 'readme-sections': {
      if (text === null) return finding('unknown', 'A readable Markdown README was not available.');
      const clean = stripCode(text);
      const missing = ['prerequisites?|requirements?', 'install(?:ation)?|setup|quick start|getting started', 'usage|example|first audit'].filter(s => !new RegExp(`^#{1,6} .*(${s})`, 'im').test(clean));
      return finding('manual-review', missing.length ? `Onboarding heading hints missing: ${missing.join('; ')}. Verify equivalent wording before filing a defect.` : 'Onboarding headings found. Verify the command sequence and expected output manually.', [E(p, 'Heading heuristic only; no example commands executed.')]);
    }
    case 'local-links': {
      const links = localLinks(files);
      if (links.broken.length) return finding('fail', 'Broken local Markdown targets found.', links.broken.map(s => E('Markdown', s)));
      if (links.deferred.length || skipped.length) return finding('manual-review', 'Supported local paths checked; unresolved syntax/anchors or scan exclusions need review.', links.deferred.map(s => E('Markdown', s)));
      if (!links.inspected) return finding('not-applicable', 'No supported local Markdown links to check. External URLs were not fetched.');
      return finding('pass', `${links.inspected} supported local Markdown targets checked. External URLs and shortcut references are outside scope.`, [E('*.md (excluding templates/)', 'See handbook/automation.md for parser limits.')]);
    }
    case 'badge-scope': {
      if (text === null) return finding('unknown', 'A readable README was not available.');
      const clean = stripCode(text);
      const urls = [...clean.matchAll(/https:\/\/(?:img\.shields\.io\/github\/actions\/workflow\/status\/|github\.com\/)[^\s)"<>]+/g)].map(m => m[0]).filter(u => u.includes('/workflow/status/') || /\/actions\/workflows\/.*\/badge\.svg/.test(u));
      if (!urls.length) return finding('not-applicable', 'No supported workflow-status badge URLs found. Other badges need editorial review.');
      const missing = urls.filter(u => { const p = new URL(u).searchParams; return !p.get('branch') || !p.get('event'); });
      if (missing.length) return finding('fail', 'Workflow badges do not explicitly select both branch and event (playbook policy, not a GitHub requirement).', missing.map(u => E(p, u)));
      return finding('pass', 'Recognised workflow badge URLs specify branch and event. Availability and actual workflow meaning are not verified.', [E(p, `${urls.length} recognised workflow badge(s).`)]);
    }
    default: throw new Error(`Unknown check: ${rule.check}`);
  }
}

/** Mutually exclusive audit dimensions. Counts are evidence coverage, never a quality score. */
export const DIMENSIONS = {
  presentation: new Set(['presentation']),
  visibility: new Set(['discoverability']),
  completeness: new Set(['completeness', 'onboarding', 'documentation', 'structure', 'community', 'releases', 'quality', 'lifecycle', 'catalogue', 'application']),
  engineering: new Set(['automation', 'security', 'performance', 'agent-readiness']),
};
export function dimensionSummary(results) {
  const grouped = Object.fromEntries(Object.keys(DIMENSIONS).map(name => [name, { ...Object.fromEntries(STATES.map(k => [k, 0])), applicable: 0, resolved: 0, rules: [] }]));
  for (const f of results) {
    const group = Object.entries(DIMENSIONS).find(([, set]) => set.has(f.category))?.[0];
    if (!group) throw new Error(`No audit dimension for category ${f.category}`);
    const dim = grouped[group]; dim[f.status]++; dim.rules.push(f.rule_id);
    if (f.status !== 'not-applicable') dim.applicable++;
    if (f.status === 'pass' || f.status === 'fail') dim.resolved++;
  }
  return grouped;
}

export async function audit(directory, options = {}) {
  const { rules, profiles } = await loadModel(options.modelRoot ?? HOME);
  const profile = profiles.find(p => p.id === (options.profile ?? 'documentation'));
  if (!profile) throw new Error(`Unknown profile: ${options.profile}`);
  if (options.facts) {
    validateSchema(options.facts, await readJson(path.join(HOME, 'schemas/facts.schema.json')));
    const keys = options.facts.facts.map(f => f.key);
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate fact keys');
    if (options.repository && options.repository.toLowerCase() !== options.facts.repository.toLowerCase()) throw new Error('Facts repository identity mismatch');
  }
  const now = options.now ?? new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid audit time');
  const scan = options.scan ?? await snapshot(directory);
  const digest = createHash('sha256');
  for (const [name, content] of [...scan.files].sort(([a], [b]) => a.localeCompare(b, 'en'))) digest.update(JSON.stringify([name, content]) + '\n');
  const results = rules.map(rule => ({ rule_id: rule.id, rule_version: rule.version, title: rule.title, category: rule.category, priority: rule.priority, basis: rule.basis, guide: rule.guide, remediation: rule.remediation, ...(!rule.profiles.includes(profile.id) ? finding('not-applicable', `Not selected by profile ${profile.id}.`) : evaluate(rule, scan, { ...options, now })) }));
  const counts = Object.fromEntries(STATES.map(state => [state, results.filter(f => f.status === state).length]));
  const applicable = results.length - counts['not-applicable'];
  return {
    schema_version: 1, tool_version: '0.4.0', observed_at: now.toISOString(),
    repository: options.repository ?? options.facts?.repository ?? null,
    revision: null, revision_note: options.remoteComparison ? 'Selected local file blobs may be compared with the reported GitHub revision, but full checkout identity remains unverified.' : 'Git revision not inspected. Facts snapshot revision is not assumed to match local files.',
    ...(options.remoteComparison ? { remote_file_comparison: options.remoteComparison } : {}),
    files_digest: `sha256:${digest.digest('hex')}`, digest_scope: 'Names and readable text only; excluded and non-text contents are not hashed.',
    profile: profile.id, counts, dimensions: dimensionSummary(results), coverage: { resolved: counts.pass + counts.fail, applicable, ratio: applicable ? (counts.pass + counts.fail) / applicable : null },
    exclusions: scan.skipped, source: { mode: options.factsKind === 'github-api' ? 'local+github-api' : options.facts ? 'local+supplied-facts' : 'local', facts_observed_at: options.facts?.observed_at ?? null, facts_revision: options.facts?.revision ?? null }, findings: results
  };
}

export function markdown(report) {
  const escape = s => String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[&<>|`\[\]]/g, c => `&#${c.charCodeAt(0)};`);
  const rows = report.findings.map(f => `| ${escape(f.rule_id)} | ${f.status} | ${f.priority} | ${escape(f.summary)} |`);
  const evidence = report.findings.filter(f => f.status !== 'not-applicable').map(f => `\n### ${f.rule_id} — ${escape(f.title)}\n\n${escape(f.remediation)}\n\nGuide: ${escape(f.guide)}\n\n${f.evidence.map(e => `- ${escape(e.location)}: ${escape(e.observation)}`).join('\n')}`);
  const dimensions = report.dimensions ? `## Presentation, visibility and completeness

These are grouped finding counts and inspection coverage, **not a quality or completion percentage**. Unverified criteria remain visible.

| Dimension | Passed | Failed | Review | Unknown | Applicable | Inspected |
|---|---:|---:|---:|---:|---:|---:|
${Object.entries(report.dimensions).map(([key, d]) => `| ${escape(key)} | ${d.pass} | ${d.fail} | ${d['manual-review']} | ${d.unknown} | ${d.applicable} | ${d.resolved} |`).join('\n')}

` : '';
  const comparison = report.remote_file_comparison;
  const comparisonBlock = comparison ? `Remote file sample: **${escape(comparison.status)}** at ${escape(comparison.revision ?? 'unknown revision')}. ${escape(comparison.scope)}\n\n${comparison.files.map(f => `- ${escape(f.path)}: ${escape(f.status)} — ${escape(f.reason)}`).join('\n')}\n\n` : '';
  return `# Repository audit\n\nProfile: **${report.profile}** · Observed: ${report.observed_at}\n\nRepository: ${escape(report.repository ?? 'local checkout (identity not verified)')}\n\n${comparisonBlock}${dimensions}Resolved checks: **${report.coverage.resolved}/${report.coverage.applicable}**. This is inspection coverage, not a quality score.\n\n${Object.entries(report.counts).map(([s, n]) => `${s}: ${n}`).join(' · ')}\n\n| Rule | Status | Priority | Observation |\n|---|---|---|---|\n${rows.join('\n')}\n${evidence.join('\n')}\n\n## Limitations\n\nRead-only bounded local scan; no target scripts or Git commands executed. Network is used only when explicitly requested with --github; a selected-file hash comparison, if requested, does not prove a full checkout revision match. Caller-supplied snapshots are not live API verification. See the JSON report for exclusions and digest scope. No security certification is implied.\n`;
}
