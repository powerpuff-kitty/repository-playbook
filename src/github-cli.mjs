#!/usr/bin/env node
import { collectGitHubFacts } from './github.mjs';

const usage = `Usage: node src/github-cli.mjs OWNER/REPO
Produces a dated, read-only GitHub.com facts snapshot on stdout.
Optional authentication: export GITHUB_TOKEN with read-only access.
This command only makes GET requests to api.github.com; it does not inspect local files.
No token or raw API response is printed.
`;
try {
  if (process.argv.length === 3 && process.argv[2] === '--help') process.stdout.write(usage);
  else if (process.argv.length !== 3) throw new Error('Expected exactly one OWNER/REPO argument (try --help)');
  else process.stdout.write(`${JSON.stringify(await collectGitHubFacts(process.argv[2], { token: process.env.GITHUB_TOKEN ?? '' }), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`repository-playbook GitHub observation: ${String(error.message).replace(/[\r\n\u001b]/g, ' ')}\n`);
  process.exitCode = 2;
}
