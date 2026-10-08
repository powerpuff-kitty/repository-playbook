# Roadmap

## Implemented in 0.1.0

The handbook, 36 canonical rules, four baseline profiles, reusable templates, annotated examples and the embedded-AI case study form the initial knowledge base. The offline CLI performs bounded local inspection, accepts explicit dated facts and emits Markdown or JSON findings. Tests, schema/reference validation, deterministic rule generation, self-audit CI and a standalone explorer build are included.

## P1 — Verification and adoption

Establish and verify private security and conduct reporting routes. Configure effective required checks after the `quality` job has run; inspect bypasses rather than assuming a file enables protection. Populate accurate About metadata. These settings are not changed by the auditor or this bootstrap.

Add a read-only GitHub adapter with pagination, rate-limit handling, least-privilege permissions, provenance and inherited community defaults. Inspect effective protections/rulesets and treat inaccessible settings as unknown. Keep it optional so offline use remains complete.

Replace or complement the Markdown subset with a vetted full parser and dedicated link checker. Retain advisory handling for external timeouts, redirects and private endpoints. Add more false-positive fixtures before increasing automated coverage.

## P2 — Broader evidence

Integrate external tooling for workflow syntax, pinned references, token permissions, dependency-manifest coverage, licence evidence and Git-history size. Preserve the upstream tool's scope and version rather than translating every result into an overall quality score.

Add documented policy exceptions with owner/reason/expiry, lifecycle/team-size overlays, and CLI/hardware/game/research profiles based on real case studies. Create cross-repository reports only with explicit repository selection.

## P3 — Distribution and reviewed fixes

Decide whether to publish the CLI and deploy the explorer. Add release verification before creating distribution badges. Automatic fixes, issue creation and settings changes must be separate opt-in commands with explicit diffs and review boundaries.

No future milestone is represented as shipped. Dates for later work are deliberately not promised.
