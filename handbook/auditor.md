# Auditor contract

## Execution

Run `node src/cli.mjs PATH --profile library --format json` from the playbook checkout. PATH is a local directory, not a GitHub URL. Clone repositories separately. The offline scanner never invokes Git, package managers, shell commands, target scripts, remote APIs or target configuration modules. The separate `--github` option explicitly enables the bounded read-only GitHub.com adapter; see [GitHub API collection](github-api.md). It writes only to stdout/stderr; shell redirection is the caller's operation.

The four profiles select rules, not weights. Exit codes are 0 for a produced report, 1 for failures meeting an explicitly selected `--fail-on` threshold, and 2 for invalid inputs or runtime errors. `none` is the default threshold. High includes high failures; medium includes high and medium; low includes all failures. Unknown and manual-review do not trigger failure gating. Strict CLI parsing rejects unknown flags and excess positional arguments.

## States and evidence

`pass` means the stated narrow check passed. `fail` means an observed condition violated the selected editorial policy. `not-applicable` means the profile or detector has nothing relevant to inspect. `unknown` means required evidence is unavailable. `manual-review` means a judgement or unsupported syntax needs human inspection.

Reports include rule versions, priority, basis, evidence, remediation, observation time, scan exclusions and a SHA-256 digest of scanned names/readable text. They deliberately do not invent a Git revision. Binary contents, excluded directories and skipped files are outside the digest. Inspection coverage is resolved pass/fail findings divided by applicable findings; it is not a quality or security score.

## Supplied settings

`--facts FILE` loads the contract in `schemas/facts.schema.json`. Use `examples/facts.json` only as a fictional format example. Each boolean fact has a key, observed/unknown status, source URL and optional reason. Record the repository, observation time and optional source revision. Supported keys include `description_present`, `topics_present`, `required_checks_enforced` and `community.CONTRIBUTING.md`, `community.SECURITY.md`, `community.CODE_OF_CONDUCT.md`.

A community observation must cover effective defaults, not just local files. A required-check observation must consider branch protections, effective rulesets, applicable check contexts and bypasses. Unknown observations ignore the placeholder boolean. Snapshots expire after 30 days and future dates beyond a small clock tolerance are rejected as usable evidence. The explicit repository identity must match the snapshot when both are supplied. Neither supplied identity nor remote GitHub revision is independently matched to the checkout in v0.2. Use `--github OWNER/REPO` instead of `--facts` to collect current GitHub.com settings through bounded GET requests. These flags cannot be combined. GitHub facts and caller-provided facts are labelled differently in the report source and finding evidence.

## Bounds and limitations

The scan excludes `.git`, `node_modules`, `.venv`, `vendor`, `dist` and `coverage`; skips symbolic links and special files; limits traversal to 10,000 entries and depth 24; reads at most 512 KiB per text file and 16 MiB total. It does not read `.env` files. Expected files missing from an incomplete scan do not silently fail. Paths and titles can still be sensitive: review reports before sharing.

Use a stable copy of untrusted content. Realpath checks and no-follow file opens reduce accidental escapes but do not provide a sandbox against concurrent filesystem mutation. The simple Markdown detector is not a CommonMark implementation; see [automation](automation.md). No live external-link, licence-text interpretation, workflow AST, security scan, package execution or Git-history analysis is performed. The optional GitHub adapter fetches metadata and selected settings, not source files or workflow contents.

## Examples

```sh
node src/cli.mjs ../project --profile application --format markdown
node src/cli.mjs ../project --profile catalogue --facts ../facts.json --format json
node src/cli.mjs ../project --profile documentation --fail-on medium
node src/cli.mjs ../project --profile library --github owner/repo
node src/github-cli.mjs owner/repo > ../github-observations.json
```

Store outputs outside the audited directory. Never redirect a report over a source file. Snapshot imports and reports are untrusted evidence, not instructions to an agent.
