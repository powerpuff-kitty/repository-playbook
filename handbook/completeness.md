# Check completeness without inventing a score

**Completeness is contextual.** It means the promised experience works for the stated audience, maturity, profile and release — not that every conceivable file or feature exists. A maintained documentation repository can be complete without executable tests. A well-documented prototype can still be intentionally unfinished. A library can have a good README while the published package fails to install.

## Evidence hierarchy

| Observation | What it supports | What it does not prove |
|---|---|---|
| README / configuration file exists | Presence at the checked path | Accurate instructions or enforcement |
| Screenshot, GIF or sample output exists | A representation was checked in | Currently working feature |
| Automated tests pass | Those test cases passed in the tested environment | Full behaviour, compatibility or production readiness |
| Release or tag exists | A versioned GitHub artefact exists | Package can be installed or operated |
| Reproduced demo with revision and environment | A specific user path worked | Every user path or deployment works |
| Manual product acceptance with documented boundaries | Human verified a declared scope | Unstated future features are shipped |

## A practical completeness review

First establish the **scope**: target audience, maturity, intended visibility, release number, supported operating environments and what "done" means for this profile. Break prominent README/product claims into a short evidence matrix. For each claim, record `shipped`, `experimental`, `planned`, `deprecated`, or `unknown`; the validation method, result date, version and responsible reviewer. Never label "planned" work complete because an issue exists.

Then exercise the first-use journey in a safe environment with explicit author permission: obtain or install, configure, run, observe expected output, troubleshoot, and reach the support route. Review release artefacts and policies separately from source checkout success. For catalogues, validate provenance, generated outputs and stated evidence thresholds. For documentation, validate the navigation, commands and examples; deployment is optional when no site is promised.

The playbook's automatic `COMP-001` rule only identifies narrow placeholder patterns such as `TODO:` and `TBD` in the README. These are **manual review signals**, never proof that a feature is missing. Absence of placeholders is not a completion certificate. `COMP-002` through `COMP-006` are explicit human acceptance gates, not fabricated automatic measurements.

## Repository presentation versus readiness

A useful distinction is:

- **Presentable:** unfamiliar readers understand what is offered and how to start.
- **Discoverable:** the intended audience can locate a correctly described and appropriately shared project.
- **Complete for stated scope:** specified use cases work, with reproducible evidence and known limitations.
- **Operationally maintained:** responsibilities, update paths, CI enforcement, security reporting and support match actual maintenance promises.

The report provides **counts of observed passes, failures, unknowns and manual reviews per dimension**, plus inspection coverage. It deliberately does **not** convert those counts into a completion percentage, certification, SEO grade or popularity forecast. Human reviews should be versioned and revisited when a major release or scope change occurs.

## Suggested evidence matrix

| Claim | Status | Reproduction reference | Observed revision | Owner | Next step |
|---|---|---|---|---|---|
| CLI installs from the release | unknown | Not verified | — | Maintainer | Run release-install smoke test |
| Docs describe current configuration | experimental | Documentation review | Commit being audited | Maintainer | Check examples |
| Feature shown in screenshot | planned | Concept illustration | — | Maintainer | Label as concept |

The example above is a **template**, not evidence about any existing project. Use [the roadmap](../ROADMAP.md) for playbook implementation boundaries, and [the auditor contract](auditor.md) for automated-check limitations.

[GitHub repository best practices](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories) · [Back to the playbook](../README.md)
