# Treat every badge as a claim

Decide which question each badge answers: current CI status, an available release, a measured property, a licence, or a navigation destination. Give it meaningful alt text and a click target that explains the evidence. Keep visual style and labels consistent without requiring a fixed badge count.

A static green label saying live is a navigation element, not an uptime monitor. A documentation workflow badge says nothing about hardware compatibility or benchmark reproduction. A licence badge cannot override the actual licence files. Preserve distinctions between code, catalogue data and upstream assets when those distinctions matter.

For recognised GitHub Actions status badges, this playbook prefers explicit `branch` and `event` parameters. This makes the intended status scope easier to inspect. Shields documents both selectors. The preference is an editorial policy, not a GitHub validity requirement.

Check external badge availability separately from its URL syntax. Network failures, private repository access and stale caches require different interpretations. The offline check only inspects recognised workflow URL parameters; it neither downloads SVG images nor verifies that a workflow passed. Other badges and HTML badge markup require manual review.

Good: a catalogue-validation badge linked to its workflow and scoped to main pushes. Weak: ten technology logos above any explanation of what the project does.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://shields.io/badges/git-hub-actions-workflow-status). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
