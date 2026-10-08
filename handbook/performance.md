# Optimise measured cost

Measure working-tree size, Git object history and clone cost separately. Removing a large file from the current tree does not establish that it is absent from history. Use a specialised tool such as git-sizer for history measurements; the playbook's bounded text scan does not perform this analysis.

Choose a storage strategy for large generated files and binary assets based on how users consume them. Keep small, useful catalogue exports when they improve portability. Avoid frequent commits that only rewrite timestamps or reorder generated records without meaning.

Inspect CI duration and failure behaviour before changing caching or parallelism. Cancel obsolete work where safe, bound timeouts, and avoid duplicate checks on the same change. A cache that crosses an inappropriate trust boundary can cost more than it saves.

Do not automatically rewrite shared history or migrate assets to a paid storage service. Those changes affect collaborators and potentially billing. First produce a measurement, an impact assessment and a reversible plan. This profile's performance findings remain manual review until a specialised measurement is attached.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
