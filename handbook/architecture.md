# Architecture and decisions

The implementation is a dependency-free Node.js 22 ES-module project. `rules/catalog.json` is authoritative, profile files define supported baseline contexts, and JSON Schema documents describe the contracts. The original design sketched YAML; v0.1 deliberately uses strict JSON to avoid installing parser dependencies for an offline audit. The interchange contract matters more than the authoring syntax. A YAML authoring adapter can be added later without changing rule IDs.

`src/model.mjs` loads and validates trusted playbook metadata. Its validator implements only the explicitly listed JSON Schema keywords used by this repository and rejects unsupported keywords; it is not a general JSON Schema library. `src/scan.mjs` reads bounded local text and detects a documented subset of local Markdown targets. `src/audit.mjs` evaluates rules and produces evidence-bearing findings. `src/cli.mjs` only handles inputs, formatting and exit status.

`npm run generate` derives the README rule table and profile matrix. The strict JSON catalogue already serves as the machine-readable rule export, so there is no redundant JSON copy. Check mode compares bytes without writing. `npm run site:build` produces a standalone HTML explorer with inline data and no analytics, remote fonts or framework runtime. Guide links intentionally open the repository documentation. Deployment is separate and not configured.

The trust boundary is local static inspection. Target code is never imported or executed. Settings arrive only as explicit dated observations, with identity and freshness caveats. The first release prioritises inspectable failure semantics over a large number of weak automatic passes.

Future adapters should translate external evidence from GitHub, Repolinter, actionlint, Lychee, Scorecard or git-sizer into this finding model. Do not reimplement specialised engines unnecessarily. Any future writer must be separate, opt-in and produce a reviewable diff; no automatic fixes or settings mutation exist here.
