# Make authority and boundaries visible

Choose directories that reflect the project rather than forcing every repository into the same layout. A library may need source, tests and examples. A data catalogue may additionally need schemas, input manifests, measurement records and generated exports. A tiny guide does not need a monorepo structure.

Document which files are authoritative and which are derived. For each generated area, give the exact regeneration command and explain how freshness is checked. Distinguish runnable examples from benchmark results and from speculative designs. Organise evidence separately from code that performs the measurement.

Keep the README directory map aligned with reality. When a second package or agent interface is added, update the map and dependency-maintenance scope. An omitted directory is often an onboarding problem, not evidence that the directory itself should move.

Use editor and line-ending conventions that reduce accidental churn. The presence check for `.editorconfig` is a playbook preference; it does not prove that formatting is enforced. Do not create empty architecture or governance files just to fill a template. Add those documents when there is a real decision or process to explain.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
