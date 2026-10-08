# Changelog

## 0.3.0 — 2026-10-08

Add conservative local checks for mutable GitHub Action references and explicit `write-all` tokens (`SEC-001` version 2), plus manifest-to-Dependabot ecosystem/directory coverage (`QUAL-004` version 2). Unusual YAML, alternate updater services and inaccessible inputs remain manual/unknown.

Add opt-in `--compare-remote`, comparing up to 10 selected local documentation/configuration Git blob hashes with GitHub file metadata for the observed immutable revision. No local bytes are uploaded; this is not full checkout or deployment verification. Expanded negative-case tests. Offline mode remains the default; no npm publication or hosted deployment.

## 0.2.0 — 2026-10-08

Add opt-in GitHub.com REST inspection via `--github OWNER/REPO` and an independent `src/github-cli.mjs` facts exporter. The adapter makes bounded GET requests, validates destinations, refuses redirects, limits pagination/response size and distinguishes missing facts, rate limits and hidden bypasses from observed failures. Adds metadata, branch/ruleset required checks and effective public community defaults, with dated evidence and regression coverage. Offline use remains unchanged; remote revision is not assumed to match local files. No package publication or hosted deployment.

## 0.1.0 — 2026-10-08

Initial implementation: 36 versioned rules, four profiles, a practical handbook, annotated templates and an embedded-AI case study. Includes a dependency-free offline audit CLI, five-state evidence reports, explicit failure thresholds, optional dated settings snapshots, schema/reference validation, deterministic generated outputs, regression tests and a standalone rule explorer build.

This is not an npm publication or hosted deployment. Live GitHub collection, general Markdown parsing, specialised security adapters, custom policy overlays and automatic remediation are not implemented.
