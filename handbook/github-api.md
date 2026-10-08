# Opt-in GitHub API observations

The `src/github.mjs` adapter makes bounded, **read-only GET** requests to GitHub.com. It is separate from the offline filesystem scanner. You must explicitly set `--github OWNER/REPO` to enable network use; a local audit never contacts external services by default. The adapter does **not** upload your local source, run repository code, write to GitHub, or create a credential file.

## Run it

```sh
node src/cli.mjs ../local-repo --profile library --github owner/repo
node src/cli.mjs ../local-repo --profile library --github owner/repo --format json > ../report.json
node src/cli.mjs ../local-repo --profile library --github owner/repo --compare-remote --format json > ../compared.json
node src/cli.mjs ../local-repo --profile library --github owner/repo --compare-remote --format json > ../compared.json
node src/github-cli.mjs owner/repo > ../github-facts.json
node src/cli.mjs ../local-repo --profile library --facts ../github-facts.json
```

GitHub.com public metadata can be read unauthenticated, subject to rate limits. For private repositories, set `GITHUB_TOKEN` in the environment to an access token with the **minimum read permissions required**. In particular, some branch-protection details require administration read permission and ruleset bypass actors may not be visible even when basic rules are readable. Never commit a token or pass it through CLI arguments. This tool does not create or request elevated credentials. `--github` and `--facts` cannot be combined.

## What it collects

| Fact | Read endpoints | Interpretation |
|---|---|---|
| `description_present`, `topics_present` | Repository metadata | Narrow, dated presence checks, not editorial quality |
| `required_checks_enforced` | Default branch, classic protection, active branch rules, relevant detailed rulesets | True only when an observable status-check requirement and no relevant visible bypass supports the claim; unknown if protections or bypasses cannot be established |
| `community.CONTRIBUTING.md` | Community profile, file locations, public account `.github` fallback | Nonempty / recognised file, not completeness of contribution guidance |
| `community.CODE_OF_CONDUCT.md` | Community profile, file locations, public account `.github` fallback | Presence, not suitability of the conduct policy |
| `community.SECURITY.md` | File locations and public account `.github` fallback | Nonempty file when found; absence remains unknown without stronger evidence |

GitHub's [active branch rules endpoint](https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch) includes inherited organisation rules, omitting evaluation-only and disabled rules. GitHub [ruleset details](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset) may **omit `bypass_actors` for read-only callers**, so a missing property is not proof that no bypass exists. The [branch protection endpoint](https://docs.github.com/en/rest/branches/branch-protection#get-branch-protection) and [community profile endpoint](https://docs.github.com/en/rest/metrics/community#get-community-profile-metrics) have their own permission and evidence limits. The [default community files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) can be inherited from a public `.github` repository; the auditor checks this without requiring duplicate files.

## Safety and failure modes

- Requests are restricted to `https://api.github.com/repos/…`, follow no redirects, use a finite timeout, cap JSON responses at 1 MiB, cap requests at 30 and list pagination at five pages. Link headers cannot send the adapter to another host or endpoint.
- No background retries, token logging, or external hosts. A rate limit, 403, 404 ambiguity, timeout, truncated page collection or hidden bypass becomes **unknown** rather than a convenient positive.
- Results include the API observation time and a remote default-branch revision when available. **The local checkout is not compared with that revision unless `--compare-remote` is explicitly set**. Do not cite the result as validation of deployed or published code.
- Presence and required-check observations are narrow. A `SECURITY.md` file is not proof of a working private disclosure route; a required check can be flaky, ineffective, or inappropriate. Review controls, permissions, bypasses and real behaviours separately.
- Tokens only leave as Authorization headers to the fixed GitHub API origin. Consult GitHub's current API version and permissions if endpoints evolve; the adapter uses a versioned REST header.

To run a strictly offline audit, omit `--github` and optionally supply your own dated `--facts FILE` snapshot. See the [auditor contract](auditor.md) and [privacy/permission guidance](security.md).
