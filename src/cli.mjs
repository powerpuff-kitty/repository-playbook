#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { open } from 'node:fs/promises';
import { audit, markdown } from './audit.mjs';
import { collectGitHubFacts, repositoryName } from './github.mjs';

const usage = `Repository Playbook 0.2.0 (local checkout; not published on npm)
Usage: node src/cli.mjs [directory] [options]
  --profile documentation|catalogue|library|application
  --format markdown|json       Default: markdown
  --facts FILE                 Optional dated, schema-validated settings observations
  --github OWNER/REPO          Opt into read-only GitHub.com API observations (network)
  --repository OWNER/REPO      Optional display identity (caller supplied)
  --fail-on high|medium|low|none  Failure threshold; default none
  --help
Exit codes: 0 report produced; 1 selected fail findings; 2 input/runtime error.
No target commands, writes or Git commands. Network only with --github.
Redirect stdout to save a report; do not overwrite files in the audited checkout.
`;
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: { profile: { type: 'string', default: 'documentation' }, format: { type: 'string', default: 'markdown' }, facts: { type: 'string' }, github: { type: 'string' }, repository: { type: 'string' }, 'fail-on': { type: 'string', default: 'none' }, help: { type: 'boolean' } } });
  if (values.help) process.stdout.write(usage);
  else {
    if (positionals.length > 1) throw new Error('Only one directory is allowed');
    if (!['markdown', 'json'].includes(values.format)) throw new Error('Unknown format');
    const priorities = ['high', 'medium', 'low'];
    if (![...priorities, 'none'].includes(values['fail-on'])) throw new Error('Unknown failure threshold');
    if (values.repository) repositoryName(values.repository);
    if (values.github) repositoryName(values.github);
    if (values.github && values.facts) throw new Error('--github and --facts are mutually exclusive');
    if (values.github && values.repository && values.repository.toLowerCase() !== values.github.toLowerCase()) throw new Error('GitHub and display repository identities do not match');
    let facts;
    if (values.facts) {
      const handle = await open(values.facts, 'r');
      let text;
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Facts snapshot must be a regular file of at most 1 MiB');
        const buffer = Buffer.alloc(stat.size + 1);
        let size = 0;
        while (size < buffer.length) {
          const chunk = await handle.read(buffer, size, buffer.length - size, size);
          if (!chunk.bytesRead) break;
          size += chunk.bytesRead;
        }
        if (size > stat.size) throw new Error('Facts snapshot changed during read');
        text = buffer.subarray(0, size).toString('utf8');
      } finally { await handle.close(); }
      facts = JSON.parse(text);
      if (values.repository && values.repository.toLowerCase() !== facts.repository.toLowerCase()) throw new Error('Facts repository identity mismatch');
    }
    if (values.github) facts = await collectGitHubFacts(values.github, { token: process.env.GITHUB_TOKEN ?? '' });
    const report = await audit(positionals[0] ?? '.', { profile: values.profile, facts, factsKind: values.github ? 'github-api' : 'supplied', repository: values.repository ?? (values.github ? facts.repository : undefined) });
    process.stdout.write(values.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : markdown(report));
    if (values['fail-on'] !== 'none' && report.findings.some(f => f.status === 'fail' && priorities.indexOf(f.priority) <= priorities.indexOf(values['fail-on']))) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`repository-playbook: ${String(error.message).replace(/[\r\n\u001b]/g, ' ')}\n`);
  process.exitCode = 2;
}
