# Make catalogue claims auditable

Record each item's primary source, review date, kind, intended use, runtime requirements and evidence level. Source-backed metadata is not the same as a reproduced measurement. Keep unknown fields explicit and avoid treating absence of evidence as compatibility.

Separate input manifests, schemas, generated views, runnable examples and benchmark observations. One source can drive the README table, JSON exports and a browser explorer, but freshness must be checked. Generated counts should never be manually edited independently.

Use a versioned schema and tests for cross-field relationships. For example, a procedural primitive should not imply learned model weights. Record benchmark environment details rather than moving observations between devices. Design-only recipes should be labelled as such.

Document licensing boundaries between catalogue code, original descriptions, exported data and referenced upstream projects. Listing a model does not grant rights to its weights. The embedded-AI case study shows both a useful evidence-first structure and documentation/configuration mismatches worth correcting.

The catalogue profile adds provenance and licence-boundary review. It does not assume every item is runnable, reproduced or eligible for a single aggregate accuracy score.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
