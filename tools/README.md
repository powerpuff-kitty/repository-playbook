# Existing work to reuse

This is a curated starting set, not an exhaustive market survey or a promise about current maintenance. Verify a tool's current release, licence and supported runtime before adopting it. No third-party code is vendored and no adapter is implied to be implemented.

| Project | Useful scope | Integration boundary |
|---|---|---|
| [Open Source Guides](https://github.com/github/opensource.guide) | Open-source participation and maintenance guidance | Reference, not a universal checklist. |
| [Standard README](https://github.com/RichardLitt/standard-readme) | README conventions | Adapt to audience and project type. |
| [Best README Template](https://github.com/othneildrew/Best-README-Template) | Copyable README structure | Verify setup commands and remove irrelevant sections. |
| [Awesome README](https://github.com/matiassingers/awesome-readme) | Presentation examples | Explain why an example works; avoid decoration-driven grading. |
| [GitHub special files and paths](https://github.com/joelparkerhenderson/github-special-files-and-paths) | File and path inventory | Check current platform behaviour in official docs. |
| [Repolinter](https://github.com/todogroup/repolinter) | Configurable repository policy checks | Prefer an adapter over duplicated detectors. |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | Security-oriented repository evidence | Preserve per-check meaning; not documentation quality. |
| [OpenSSF Best Practices](https://github.com/ossf/best-practices-badge) | Best-practice criteria | Treat as an external framework, not our certification. |
| [git-sizer](https://github.com/github/git-sizer) | Git object/history size metrics | Working-tree scans do not replace it. |
| [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) | Markdown style checks | Formatting is not correctness of documentation. |
| [Lychee](https://github.com/lycheeverse/lychee) | Link checking | Separate deterministic targets from unreliable network responses. |
| [actionlint](https://github.com/rhysd/actionlint) | Workflow static analysis | Syntax and workflow policy remain distinct from live enforcement. |

## Reference maintenance

For a new entry, explain what it does, which playbook rules it could inform, limitations and why reuse is preferable. Link primary documentation. Do not import upstream guidance verbatim or claim a recommendation has been empirically validated merely because a project is popular.
