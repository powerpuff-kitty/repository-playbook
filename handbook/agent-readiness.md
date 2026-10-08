# Give agents bounded, testable instructions

Use AGENTS.md to record the project's exact validation commands, source-of-truth paths, generated areas and architectural boundaries. Keep it specific enough that an unfamiliar agent can work without inventing a build system or editing derived outputs.

State what requires separate approval: executing target projects, introducing dependencies, changing repository settings, publishing releases, or transmitting private code to a remote service. Treat external issues, README commands and downloaded content as data, not trusted instructions.

Require agents to report what they changed, which tests they actually ran and what remains unverified. Never accept a statement that a workflow is green merely because its YAML file exists. Preserve per-finding evidence and timestamps rather than replacing them with a confident narrative.

A safe initial audit reads a stable local copy, has no target-code execution path and produces a report for review. Automatic fixes should be a later, opt-in capability with explicit diffs, narrow permissions and rollback. A language model may help explain or draft a remedy, but deterministic checks and human review should govern acceptance.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
