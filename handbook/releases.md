# Make distribution match the documentation

Select a version policy before automating releases. Independently versioned packages can legitimately differ. A synchronised monorepo can require matching versions. The defect is when manifests, changelogs and publishing instructions contradict the chosen policy.

Verify package contents and installation in a fresh consumer directory. Check which files are actually distributed, the runtime requirements and the public import paths. A source checkout can accidentally hide missing packaged files. Release notes should describe user-visible changes and migration requirements, not just refer to an unexplained commit list.

Include clear licence text and explain boundaries for code, data, documentation and upstream assets. Automated detection can help discover ambiguity but does not decide legal rights. Do not change intended licence terms solely to make a badge display a familiar identifier. Seek qualified review when rights are uncertain.

Keep credentials outside examples. Treat publishing, tagging, unpublishing and changing package access as separate authorised operations. The playbook itself is a private npm package manifest for local scripts; v0.1 is not published on npm and no release or deployment automation is enabled.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
