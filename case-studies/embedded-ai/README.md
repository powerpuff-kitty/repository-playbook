# Case study: embedded-AI

Reviewed: **2026-10-08**, based on the same-day source review at commit `dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595`.
Repository: [powerpuff-kitty/embedded-AI](https://github.com/powerpuff-kitty/embedded-AI).

This is a dated documentary case study, not a fresh test run, continuous audit or security certification. No changes to embedded-AI were made as part of implementing this playbook. Current main and settings may differ from these observations.

## Patterns worth retaining

The reviewed structure separates canonical catalogue inputs, schemas, generated exports, the package interface, MCP interface, explorer, runnable recipes and benchmark observations. The README distinguishes sourced claims from reproduced observations and unknown values. Those are useful evidence boundaries, not reasons to inflate coverage claims.

The README at the reviewed revision reports 602 entries, three reproduced observations and zero measured-RAM observations. Those figures describe that revision only. They must not be interpreted as 602 independently benchmarked models.

Source: [README at the reviewed revision](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/README.md).

## Findings mapped to playbook rules

| Rules | Observation at review | Remediation |
|---|---|---|
| DOC-003 | Local quick start starts at npm ci, without clone/cd; package import lacks installation context. | Separate browse, consume and contribute paths with complete commands. |
| DOC-004, QUAL-002 | Link script inspects catalogue/evidence URLs, not README paths, anchors or badges. | Add documentation checks and state the audit's exact scope. |
| QUAL-004 | Dependabot config covers root npm, recipes pip and Actions, but not the nested MCP npm package. | Compare all manifests with configured update coverage. |
| REL-002 | Publishing guide says package versions must match; root is 0.2.0 and MCP is 0.2.1. | Document and validate independent or synchronised versioning consistently. |
| SEC-002 | Main branch API reported unprotected; rulesets collection was empty during the review. | Inspect and configure effective required checks; reconcile generated commits with normal review. |
| DOC-006 | Workflow badge URLs lack explicit branch/event selectors. | Scope status claims deliberately; do not add badges indiscriminately. |
| STRUCT-001, DOC-008 | README layout omits package/MCP/test areas; text mentions tables below after catalogue relocation. | Update navigation and the generator together; reconcile the desired inline-table requirement. |

## Evidence locations

[Link auditor](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/scripts/links.ts), [link workflow](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/.github/workflows/links.yml), [dependency configuration](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/.github/dependabot.yml), [publishing guide](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/docs/PUBLISHING.md), [root manifest](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/package.json), [MCP manifest](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/mcp/package.json).

The branch and ruleset observations came from the GitHub API during the review. These mutable endpoints do not provide immutable historical evidence on their own: [branch](https://api.github.com/repos/powerpuff-kitty/embedded-AI/branches/main), [rulesets](https://api.github.com/repos/powerpuff-kitty/embedded-AI/rulesets?includes_parents=true). Re-query them before asserting the current state.

## Repository card and visual discovery review

A user-supplied GitHub repository-card screenshot dated **2026-10-08** shows the `embedded-AI` title, a Public indicator, a descriptive evidence-first summary, seven relevant-looking AI/edge topics, TypeScript as GitHub's detected language and **Other** as its licence classification. This is **a screenshot observation**, not proof of search rankings, homepage absence, social-preview settings or the effectiveness of the actual licence files. The card is cropped, so its missing elements must not be assumed unset.

The reviewed source includes `LICENSE` (MIT code licence), `LICENSE-DATA` (CC BY 4.0 for catalogue data), and upstream terms that remain separate. GitHub's `Other` / `NOASSERTION` presentation is therefore a useful `DISC-005` **manual review**, not an automatic licensing failure. Scope and accuracy must be checked against the full licence texts before considering changes. GitHub language and topic labels are metadata, not quality grades.

Presentation/completeness checklist for this case study: validate the current rendered README hero in light/dark and mobile layouts (`PRES-001`, `PRES-003`); check any non-badge diagrams for alt text (`PRES-002`); inspect social preview manually (`PRES-004`); reconcile current About topics with the expanded procedural catalogue (`DISC-007`); test public quick-start/package installation and the claimed published version (`COMP-002`, `COMP-003`, `COMP-005`). No pass is claimed for these unperformed checks.

Sources: [reviewed README](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/README.md), [code licence](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/LICENSE), [data licence](https://github.com/powerpuff-kitty/embedded-AI/blob/dbe4d2fc9798659dfd1d5ceb1d9e05aa9060a595/LICENSE-DATA). Visual notes describe only the supplied screenshot and the dated review.

## What this demonstrates

Presence is not completeness, configuration is not enforcement, a scoped check is not a universal certificate, and independent versions are not inherently wrong. Record these distinctions before automating remediation. This case study is commentary on the repository, not a relicensing or copy of its catalogue.
