# Annotated patterns and counterexamples

## A complete consumer path

Weak: show only an import from a package with no installation, runtime or expected result.

Better: name the supported runtime, show a clean consumer directory, install the released package and include one example with a verifiable result. Source-checkout tests and released-package tests establish different things. Use the library template, but substitute commands that were actually verified.

## Badge evidence

Weak: a static green `production ready` badge with no definition or evidence.

Better: a workflow badge scoped to its intended branch and event, linked to that workflow. State what that workflow checks. Keep live-demo navigation separate from uptime and security claims.

## Missing community files

Weak: fail every repository without a root CONTRIBUTING.md.

Better: check recognised locations and inherited defaults before deciding that contribution instructions are unavailable. An offline inspection without those defaults should report unknown, not invent absence.

## Generated outputs

Weak: update a count in the README while leaving its JSON export unchanged.

Better: change canonical metadata, regenerate all views and verify deterministic output. The playbook's rule table and profile matrix demonstrate this approach.

## Version policy

Weak: call differing package versions a bug without reading the release policy.

Better: identify whether versions are independent or synchronised, then compare the policy with manifests and release instructions. The embedded-AI case study records a policy contradiction, not an inherent prohibition on independent versions.
