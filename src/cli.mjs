#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { open } from 'node:fs/promises';
import { audit, markdown } from './audit.mjs';

const usage = `Repository Playbook 0.1.0 (local checkout; not published on npm)
Usage: node src/cli.mjs [directory] [options]
  --profile documentation|catalogue|library|application
  --format markdown|json       Default: markdown
  --facts FILE                 Optional dated, schema-validated settings observations
  --repository OWNER/REPO      Optional display identity (caller supplied)
  --fail-on high|medium|low|none  Failure threshold; default none
  --help
Exit codes: 0 report produced; 1 selected fail findings; 2 input/runtime error.
No target commands, writes, Git commands or network requests are performed.
Redirect stdout to save a report; do not overwrite files in the audited checkout.
`;
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: { profile: { type: 'string', default: 'documentation' }, format: { type: 'string', default: 'markdown' }, facts: { type: 'string' }, repository: { type: 'string' }, 'fail-on': { type: 'string', default: 'none' }, help: { type: 'boolean' } } });
  if (values.help) process.stdout.write(usage);
  else {
    if (positionals.length > 1) throw new Error('Only one directory is allowed');
    if (!['markdown', 'json'].includes(values.format)) throw new Error('Unknown format');
    const priorities = ['high', 'medium', 'low'];
    if (![...priorities, 'none'].includes(values['fail-on'])) throw new Error('Unknown failure threshold');
    if (values.repository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(values.repository)) throw new Error('Expected owner/repo identity');
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
      if (values.repository && values.repository !== facts.repository) throw new Error('Facts repository identity mismatch');
    }
    const report = await audit(positionals[0] ?? '.', { profile: values.profile, facts, repository: values.repository });
    process.stdout.write(values.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : markdown(report));
    if (values['fail-on'] !== 'none' && report.findings.some(f => f.status === 'fail' && priorities.indexOf(f.priority) <= priorities.indexOf(values['fail-on']))) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`repository-playbook: ${String(error.message).replace(/[\r\n\u001b]/g, ' ')}\n`);
  process.exitCode = 2;
}
