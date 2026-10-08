# Describe the implemented project and its intended visibility

Treat the repository **name, GitHub About description, topics, homepage, visibility, language classification, licence label and README introduction as one consistent promise**. A public repository and a good search keyword strategy are not the same thing; neither stars nor frequent commits prove quality.

## GitHub repository card

- **Name and description:** identify actual deliverables and users, not only technologies. A concise description is often more useful than a dense keyword inventory.
- **Topics:** choose relevant terms supported by the current implementation. GitHub metadata showing `topics_present = true` proves presence, not relevance or any ranking benefit.
- **Homepage:** point to a real maintained demo, documentation or product page, when one exists. An empty homepage is an *advisory* when no external site has been established, not a universal defect. An existing URL still needs separate uptime and ownership checks.
- **Visibility:** select public, private or internal based on project confidentiality, collaboration and distribution. The auditor reports the observed choice for manual policy review, **never a blanket instruction to make everything public**.
- **Language label:** GitHub's language detector describes detected file composition, not a project's full stack or intended language. Compare it with real files before adjusting Linguist settings.
- **Licence label:** GitHub may display `Other` or fail to identify an SPDX licence, even for projects that deliberately separate code and data terms. Inspect the actual licence scope and upstream rights rather than changing legal terms to improve presentation.
- **Archive status:** an intentionally finished/archived example is not a failed repository. Compare archival to support and lifecycle promises.

## Search engines and shared links

When there is a public hosted documentation site, check page title and descriptions, canonical link, indexability, navigation, Open Graph/share previews, accessible content and accurate cross-links. Confirm the site actually exists before generating marketing metadata. Search rankings, traffic and indexing are **external observations**, not inferred from GitHub topics or the presence of `robots.txt`.

For the GitHub repository social preview, follow the manual review guidance in [presentation](presentation.md); the read-only collector does not reliably know whether a preview image is configured.

## Evidence boundaries

GitHub metadata is collected **only with `--github OWNER/REPO`**, and permission/availability limits are reported as unknown. The presence checks for description/topics are narrow, homepage absence and unrecognized licence IDs are advisory manual reviews, and visibility/archive are manual policy decisions. A supplied snapshot is not a live observation. The local checkout is not automatically proven to match GitHub's revision.

Use the README and source tree, a dated browser review and confirmed release/deployment results to decide whether the metadata is accurate. Avoid star exchanges, irrelevant topics, visitor counters, fabricated demos and claims of guaranteed placement.

[GitHub repository guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories) · [Presentation](presentation.md) · [Back to the playbook](../README.md)
