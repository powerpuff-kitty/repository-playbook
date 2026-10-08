# Roadmap

## Implemented in 0.1.0

The handbook, 36 canonical rules, four baseline profiles, reusable templates, annotated examples and the embedded-AI case study form the initial knowledge base. The offline CLI performs bounded local inspection, accepts explicit dated facts and emits Markdown or JSON findings. Tests, schema/reference validation, deterministic rule generation, self-audit CI and a standalone explorer build are included.

## Implemented in 0.2.0

Add optional, bounded read-only GitHub.com collection for descriptions/topics, default-branch check requirements, inherited community files and dated evidence. Handle pagination, missing permissions, rate limits and ruleset bypass visibility conservatively. Expose `--github OWNER/REPO` and a snapshot-export CLI, retaining offline-only behaviour by default. GitHub CI validates mocked transport and adversarial fixtures; no external source code is executed or local content uploaded.

## Implemented in 0.3.0

Bounded static checks flag mutable Action references and explicit `write-all` token grants; a separate check compares supported dependency manifests (including nested packages) with Dependabot's configured ecosystem/directory coverage. Complex YAML and alternative update services remain review items. With `--compare-remote`, up to 10 local documentation/configuration file hashes are compared with GitHub metadata at an immutable commit. Neither local bytes nor hashes are transmitted, and the full checkout is not verified.

## P1 — Verification and adoption

Establish and verify private security and conduct reporting routes. Configure effective required checks after the `quality` job has run; inspect bypasses rather than assuming a file enables protection. Populate accurate About metadata. These settings are not changed by the auditor or this bootstrap.

Extend live evidence to richer GitHub workflow/check metadata, private vulnerability reporting and full tracked-tree matching beyond the v0.3 selected-file sample. The current GitHub adapter covers only documented facts and intentionally leaves hidden bypasses and inaccessible settings unknown.

Replace or complement the Markdown subset with a vetted full parser and dedicated link checker. Retain advisory handling for external timeouts, redirects and private endpoints. Add more false-positive fixtures before increasing automated coverage.

## P2 — Broader evidence

Integrate dedicated tools for complete workflow syntax, advanced permissions/trust boundaries, unsupported dependency ecosystems, licence evidence and Git-history size. Preserve the upstream tool's scope and version rather than translating every result into an overall quality score.

Add documented policy exceptions with owner/reason/expiry, lifecycle/team-size overlays, and CLI/hardware/game/research profiles based on real case studies. Create cross-repository reports only with explicit repository selection.

## P3 — Distribution and reviewed fixes

Decide whether to publish the CLI and deploy the explorer. Add release verification before creating distribution badges. Automatic fixes, issue creation and settings changes must be separate opt-in commands with explicit diffs and review boundaries.

No future milestone is represented as shipped. Dates for later work are deliberately not promised.
