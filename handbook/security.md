# Separate configuration from enforcement

Start with narrow permissions and an explicit trust boundary. Pin third-party Actions to verified immutable commit references, use read-only token defaults, and grant privileges only to the job that needs them. Review changes to these references through dependency updates rather than leaving pins to become stale.

Trace untrusted pull-request content and downloaded artifacts before any privileged execution. Do not interpolate untrusted text directly into shell scripts. Never grant a repository audit tool broad write permissions merely to inspect files. Running example commands from an unfamiliar project is execution, not passive documentation review.

Inspect effective branch protection and rulesets, required check contexts, target branches and bypass actors. A checked-in settings proposal does not enable those settings. A source-control scan cannot determine whether secret scanning or private reporting is enabled.

The v0.1 auditor uses local files and optional caller-supplied observations only. Missing, expired or inaccessible settings remain unknown. A snapshot marked observed is still supplied evidence, not a live independently verified result. Report it with its date and source.

Publish a private reporting route only after verifying it. Until then, request a private contact without exposing vulnerability details. This repository's reporting route needs maintainer confirmation before a broad public release; no response-time guarantee or security certification is claimed.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/actions/reference/security/secure-use). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
