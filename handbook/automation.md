# Validate behaviour, not green decorations

Choose checks that support the project's claims: schema validation for structured rules, tests for detectors, deterministic regeneration for derived exports, and runnable examples where execution can be controlled. A workflow file is configuration, not proof that checks ran or are required before merge.

Keep pull-request checks read-only. Generated changes should be committed intentionally through the normal review path rather than pushed by a broadly privileged documentation job. Dependency maintenance must enumerate all package directories; a root update configuration does not establish coverage for a nested package.

The built-in link checker supports simple inline and reference Markdown links, images and ATX heading hints. It skips code fences, inline code and comments. Templates are excluded because they intentionally refer to files in a future target project. External URLs are never fetched. Shortcut references, complex CommonMark, HTML, root-relative targets and unresolved anchors are outside its automatic pass scope or deferred for review. It is not a replacement for a full Markdown parser or Lychee.

Use dedicated tools such as actionlint for workflow syntax and policy tools for deeper checks. Keep network-dependent link audits separate from deterministic local validation, with retry limits and an advisory reporting policy. A timeout is not proof of a dead URL.

CI in this repository validates schemas, supported local links, tests, generated freshness, a self-audit and a static explorer build. It deliberately does not publish artifacts or modify repository settings.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/actions/reference/security/secure-use). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
