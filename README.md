# Repository Playbook

> Make repositories easier to understand, use, contribute to and maintain — with evidence-backed guidance, reusable templates and read-only checks.

[![CI on main pushes](https://img.shields.io/github/actions/workflow/status/powerpuff-kitty/repository-playbook/ci.yml?branch=main&event=push&label=checks)](https://github.com/powerpuff-kitty/repository-playbook/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Start here](handbook/getting-started.md) · [Presentation](handbook/presentation.md) · [Visibility](handbook/discoverability.md) · [Completeness](handbook/completeness.md) · [Profiles](generated/profile-matrix.md) · [Templates](templates/README.md) · [Case study](case-studies/embedded-ai/README.md) · [Roadmap](ROADMAP.md)

## What this is

A practical handbook, an offline auditor and optional read-only GitHub settings collection for **documentation repositories, catalogues, libraries and applications**. The catalogue connects each rule to its rationale, applicability, evidence, references and remediation. The full rule table is generated below from one canonical source.

This is not a star-growth service, a security certification or a universal repository score. A file can exist while its instructions are wrong; a workflow can pass without being required on the default branch. Those are different observations.

## Presentation, visibility and completeness

The auditor now treats **presentation**, **visibility/discoverability**, **completeness for the stated scope**, and **engineering controls** as separate dimensions. Markdown and JSON reports display per-dimension pass, fail, unknown and manual-review counts plus **inspection coverage — not a quality, SEO or completion score**.

- **Presentation:** README heading/intro, substantive image alt text, badges, screenshots and social-preview review. Visual attractiveness and rendered layouts remain manual.
- **Visibility:** GitHub About description and topics, homepage presence, intentional public/private state, archive context and GitHub licence-classification discrepancies. Metadata presence is not topic relevance or search ranking.
- **Completeness:** narrow README placeholder detection and explicit human checks for reproducible examples, real feature behaviour, release installation, limitations and planned-versus-shipped scope.

The `--github` option is required for live About metadata; offline checks remain network-free. A GitHub **Other** licence label is an *advisory*, especially for multi-licence repos — not evidence that their legal licences are invalid. Repository social preview cannot be reliably established from the supported read-only API and needs a manual browser check. No artificial badge counts, screenshot requirements or popularity thresholds are imposed.

## Prerequisites

Node.js 22 or newer is required for the tools. Git is only needed to obtain a checkout. There are **no npm dependencies**. Offline audits and reading the handbook need no API token; live GitHub observations are explicitly opt-in and may need a read-only `GITHUB_TOKEN` for private repositories.

## Quick start

```sh
git clone https://github.com/powerpuff-kitty/repository-playbook.git
cd repository-playbook
npm ci --ignore-scripts
npm run check
```

Expected result: schema/reference validation, automated tests and generated-output freshness checks complete successfully. This validates the playbook itself, not a target project's security.

## First audit

Run from this checkout; the target is a separate local directory:

```sh
npm run audit -- ../your-project --profile library
node src/cli.mjs ../your-project --profile library --format json > ../audit.json
node src/cli.mjs ../your-project --profile catalogue --fail-on high
```

The report records `pass`, `fail`, `not-applicable`, `unknown` and `manual-review`, with evidence and remediation. The ratio is **inspection coverage, not a quality score**. Default exit status is zero when a report is produced; `--fail-on` opts into gating actual failures. Unknowns and manual reviews do not silently become passes or failures.

To inspect actual GitHub settings **only when requested**:

```sh
node src/cli.mjs ../your-project --profile library --github owner/repo
node src/github-cli.mjs owner/repo > ../github-facts.json
# Extra opt-in GitHub requests for selected file-hash comparison
node src/cli.mjs ../your-project --profile library --github owner/repo --compare-remote --format json > ../compared.json
# Optional: verify a bounded sample of local file hashes against the exact remote revision
node src/cli.mjs ../your-project --profile library --github owner/repo --compare-remote --format json > ../compared.json
# Optional for private repositories: export GITHUB_TOKEN with read-only access
```

`--github` performs bounded GET requests to GitHub.com, checks default-branch requirements and community defaults, and records API sources. The checkout is never uploaded. Optional `--compare-remote` checks SHA-1 Git blob hashes of up to 10 selected readable documentation/configuration files against metadata at the remote commit, but **does not prove that the entire checkout or source tree matches**. The offline `--facts ../observations.json` alternative remains supported; the two flags are mutually exclusive. See [GitHub adapter](handbook/github-api.md), [snapshot format](handbook/auditor.md), and [illustrative fixture](examples/facts.json). Stale snapshots older than 30 days are not passing evidence.

## Usage: authors and maintainers

Edit `rules/catalog.json`, `profiles/*.json`, handbook pages or templates, then run:

```sh
npm run generate
npm run check
npm run site:build
```

The final command writes a standalone, searchable `dist/index.html`. Open that file in a browser. It has profile, priority and text filters; it does not require a server or upload your repositories. **The website is not deployed and the CLI is not published on npm.**

## How it is organised

```text
handbook/       practical guides, auditor contract and architecture
rules/          canonical JSON rules (no runtime parser dependencies)
profiles/       four baseline applicability profiles
schemas/        rules, profiles, supplied facts and report contracts
templates/      explained starting points; never blindly applied
examples/       annotated patterns and fictional test observations
case-studies/   dated reviews with exact source revisions
tools/          existing projects to reuse rather than replace
src/            bounded offline scanner, checks, CLI and optional API reader
scripts/        validation, deterministic generation and site build
tests/          node:test unit, integration and adversarial fixtures
generated/      derived applicability matrix
.github/        contribution forms and read-only CI
```

## Limitations and safety

The local auditor never runs target scripts or Git commands and never accesses the network unless `--github` is explicitly set. The online adapter only makes bounded GET requests to `api.github.com`; it never uploads local contents. The filesystem scanner skips symlinks and common generated/vendor directories, bounds text reads and reports exclusions. Audit a stable copy of untrusted content: these checks are **not a sandbox against hostile concurrent filesystem changes**.

Local-link checking covers a documented Markdown subset; external URLs, complex syntax and some anchors require other tools or review. The static workflow and dependency-update detectors cover only documented safe-to-parse subsets; unsupported YAML and indirect trust flows require manual review. Version-policy consistency and licence boundaries still require review. A caller-supplied settings snapshot is not independent API verification. A live GitHub observation proves only a narrow setting; even a matching remote-file sample does not prove full checkout identity. See [the full contract](handbook/auditor.md).

## Rule catalogue

<!-- RULES:START -->
**53 rules · 4 profiles.** Presence checks are not content-quality certification.

| Rule | Guidance | Priority | Verification |
|---|---|---|---|
| DISC-001 | [Explain the repository in its About description](handbook/discoverability.md) | medium | setting |
| DISC-002 | [Use relevant repository topics](handbook/discoverability.md) | low | setting |
| DOC-001 | [Provide a nonempty README](handbook/readme.md) | high | file |
| DOC-002 | [State purpose, audience and boundaries](handbook/readme.md) | high | manual |
| DOC-003 | [Provide a complete first-use sequence](handbook/readme.md) | high | readme-sections |
| DOC-004 | [Keep supported local Markdown targets resolvable](handbook/automation.md) | medium | local-links |
| DOC-005 | [Use purposeful and accessible badges](handbook/badges.md) | low | manual |
| DOC-006 | [Scope workflow badges to branch and event](handbook/badges.md) | low | badge-scope |
| DOC-007 | [Disclose limitations and evidence](handbook/documentation.md) | high | manual |
| DOC-008 | [Provide useful documentation navigation](handbook/documentation.md) | medium | manual |
| STRUCT-001 | [Explain the actual repository layout](handbook/structure.md) | medium | manual |
| STRUCT-002 | [Identify authoritative and generated files](handbook/structure.md) | medium | manual |
| STRUCT-003 | [Document editor whitespace conventions](handbook/structure.md) | low | file |
| COMM-001 | [Provide contribution instructions](handbook/contribution.md) | medium | community |
| COMM-002 | [Provide a private security reporting route](handbook/security.md) | high | community |
| COMM-003 | [State contributor behaviour and enforcement](handbook/contribution.md) | medium | community |
| COMM-004 | [Make change review expectations discoverable](handbook/contribution.md) | low | file |
| COMM-005 | [Make ownership and triage workable](handbook/contribution.md) | medium | manual |
| QUAL-001 | [Provide discoverable CI workflow configuration](handbook/automation.md) | medium | workflow |
| QUAL-002 | [Test the documented behaviours](handbook/automation.md) | high | manual |
| QUAL-003 | [Check generated-output freshness](handbook/automation.md) | medium | manual |
| QUAL-004 | [Cover observed dependency manifests in version-update policy](handbook/automation.md) | high | dependency-coverage |
| SEC-001 | [Pin workflow Actions and avoid write-all tokens](handbook/security.md) | high | workflow-security |
| SEC-002 | [Require relevant checks before merging](handbook/security.md) | high | setting |
| SEC-003 | [Keep untrusted execution out of privileged contexts](handbook/security.md) | high | manual |
| REL-001 | [Provide explicit licence text](handbook/releases.md) | high | file |
| REL-002 | [Keep version and release policy consistent](handbook/releases.md) | high | manual |
| REL-003 | [Verify the distributed installation path](handbook/releases.md) | high | manual |
| PERF-001 | [Control repository and history growth](handbook/performance.md) | medium | manual |
| PERF-002 | [Keep CI cost proportional to risk](handbook/performance.md) | low | manual |
| AGENT-001 | [Provide project-specific agent instructions](handbook/agent-readiness.md) | low | file |
| LIFE-001 | [Communicate maintenance status and handover](handbook/lifecycle.md) | medium | manual |
| CAT-001 | [Record catalogue provenance and unknowns](handbook/catalogues.md) | high | manual |
| CAT-002 | [Separate catalogue code, data and upstream rights](handbook/catalogues.md) | high | manual |
| APP-001 | [Document environment and deployment boundaries](handbook/applications.md) | high | manual |
| APP-002 | [Document operation and recovery](handbook/applications.md) | high | manual |
| PRES-001 | [Present a title and useful introduction above the fold](handbook/presentation.md) | medium | readme-first-screen |
| PRES-002 | [Describe nondecorative documentation images accessibly](handbook/presentation.md) | medium | image-presentation |
| PRES-003 | [Review first-screen hierarchy and badge density](handbook/presentation.md) | medium | manual |
| PRES-004 | [Review social preview and share-card representation](handbook/presentation.md) | low | manual |
| PRES-005 | [Keep product imagery representative of current behaviour](handbook/presentation.md) | medium | manual |
| DISC-003 | [Configure a useful homepage or docs destination when relevant](handbook/discoverability.md) | medium | setting-advisory |
| DISC-004 | [Choose intentional public, private or internal visibility](handbook/discoverability.md) | medium | setting-context |
| DISC-005 | [Investigate an unrecognized GitHub licence label](handbook/discoverability.md) | medium | setting-advisory |
| DISC-006 | [Make archive state match the repository lifecycle](handbook/discoverability.md) | low | setting-context |
| DISC-007 | [Keep About metadata, topics and README scope consistent](handbook/discoverability.md) | high | manual |
| DISC-008 | [Review hosted documentation discovery and share metadata](handbook/discoverability.md) | low | manual |
| COMP-001 | [Review explicit unfinished README placeholders](handbook/completeness.md) | medium | placeholder-review |
| COMP-002 | [Reconcile advertised features with demonstrable behaviour](handbook/completeness.md) | high | manual |
| COMP-003 | [Validate the complete first-user journey](handbook/completeness.md) | high | manual |
| COMP-004 | [Distinguish complete, experimental and planned scope](handbook/completeness.md) | medium | manual |
| COMP-005 | [Verify release, installation and support expectations](handbook/completeness.md) | medium | manual |
| COMP-006 | [Match demo and example data with actual outputs](handbook/completeness.md) | medium | manual |
<!-- RULES:END -->

## Contributing and help

Use [CONTRIBUTING.md](CONTRIBUTING.md) for rule proposals, tests and evidence expectations. Report false positives through the issue form. Security concerns follow [SECURITY.md](SECURITY.md), not public exploit reports. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for participation expectations.

Status: **experimental v0.3.0**. Behaviour and report contracts may evolve; breaking changes will be documented in [CHANGELOG.md](CHANGELOG.md). All original code, guidance and templates in this repository use the [MIT licence](LICENSE). Linked upstream projects retain their own terms.
