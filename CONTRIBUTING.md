# Contributing

## Setup and checks

Use Node.js 22 or newer. Clone this repository, change into its directory and run `npm ci --ignore-scripts`. There are no dependencies; the lockfile is still checked for consistency.

```sh
npm run generate
npm run check
npm run site:build
```

Edit canonical rule metadata, not generated tables. Keep rule IDs stable and bump a rule version for changes in interpretation. Explain whether a proposal is platform behaviour, external guidance, project policy or editorial preference. Include primary references without copying their documentation into the handbook.

For detector changes, include passing, failing, inapplicable and unavailable-evidence tests where relevant. Test malformed inputs and conservative behaviour on unsupported syntax. Use temporary local fixtures without private code or credentials. The auditor never executes fixture commands.

## Review

Use the rule-proposal form for new guidance, or the false-positive form for incorrect observations. Include the profile, rule ID, tool version and a minimal sanitised fixture. Pull requests should explain purpose, verification and risks. A manual-review result is not necessarily a defect: many useful checks require judgement.

Maintainer: the repository owner. This experimental project has no guaranteed response time. Do not add empty governance files, mandatory badge counts, popularity scores or broad write permissions merely to satisfy a checklist. See [the conduct policy](CODE_OF_CONDUCT.md) and [security instructions](SECURITY.md).
