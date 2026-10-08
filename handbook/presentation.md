# Present the repository clearly

Repository presentation includes **two different surfaces**: the compact GitHub card that appears in searches/profile listings, and the rendered repository page/README. A third surface — the social/share preview — is configured separately and is not fully observable through the read-only REST data this auditor collects.

## Repository card

Inspect the name, visibility label, description, language identification, topics, and displayed licence classification together. A short description should identify **what exists and who benefits**, not just list technologies. Topics should reflect current contents; a public indicator is a disclosure decision, not a quality score. GitHub's primary language reflects its language-detection algorithm, not necessarily the project's only or intended language.

A GitHub **Other** licence classification warrants review rather than automatic failure, especially for repositories with an MIT code licence, a separate data licence, custom terms, or third-party assets. Read the actual licence files and scope statements; do not rewrite legal terms to obtain a preferred label. See [discoverability](discoverability.md).

## README first screen

Aim for a recognizable title, a brief purpose statement and obvious next action before long tables or changelogs. Keep badges few and meaningful, and link every claim to the corresponding workflow, artefact or evidence. Use a clear hierarchy and inspect it on both narrow and wide layouts, plus dark/light themes. GitHub renders Markdown differently from a local editor; inspect the actual rendered result.

The `PRES-001` check recognises a simple ATX heading and prose near the start of a Markdown README; **passing it cannot prove the writing is clear or the layout renders well**. Missing/ambiguous headings are manual review, not necessarily defects. The `PRES-002` check excludes badge images, inventories other supported Markdown/HTML image tags and reports missing alt text for human review. Decorative images may correctly use an empty alt attribute, and the tool never fetches or renders images.

## Visual assets and media

Use a screenshot, short animation, architecture diagram or static illustration only when it increases understanding. For UI-driven applications, compare screenshots against a current running build. For libraries and catalogues, command examples and accurate output may be more useful than screenshots. Add descriptive alt text to substantive images; use appropriate empty alt for decoration. Avoid large GIFs above the first explanation, unrelated branding, forced badges and stale mockups.

## Social preview

When external sharing is important, inspect the repository's **Settings → General → Social preview** in GitHub and test the result on the platforms that matter. The read-only repository metadata endpoint does not reliably expose a configured social-preview image. The playbook marks this as manual review; it must not claim the image is absent because no image was returned from the API. Repository card details and preview images are different surfaces.

## Presentation review checklist

1. In a public/private context, does the card promise exactly what the project does?
2. Can an unfamiliar reader identify the project, audience and first action from the README's opening area?
3. Are badges specific and scoped to the states they actually measure?
4. Are links, visuals, screenshots and alt text current and useful?
5. Does the GitHub social/share preview appropriately reflect the product, if one is needed?
6. Are the README and About description consistent with release maturity and limitations?

## Limits

The static auditor intentionally avoids layout scoring, subjective aesthetics, inferred design quality, artificial badge thresholds, search rankings, screenshot interpretation and licence validity opinions. Unknown settings remain unknown. Manual inspections should record date, revision, audience, device/theme and any resulting change request.

[GitHub README documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) · [GitHub repository guidelines](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories) · [Badges](badges.md) · [Back to the playbook](../README.md)
