# Design the first-use path

Lead with one concrete sentence explaining the problem, deliverable and intended user. Follow with a small number of meaningful status signals and a clear next action. Describe maturity and limitations before readers invest in installation.

Separate paths for using a deployed interface, consuming a package and contributing from source. Each command sequence needs prerequisites, the expected working directory, configuration boundaries and an observable result. A code import without installation is not a complete consumer quick start. A test from the source tree is not proof that a published package installs correctly.

For a catalogue, an inline generated table can be useful. Keep one authoritative generator, stable navigation and a deliberate size policy. Do not remove an inline table and leave prose saying that it appears below. Long content may belong in a linked reference guide, but that is an audience decision rather than a mandatory minimalism rule.

GitHub recognises READMEs in `.github`, the root and `docs`, with `.github` taking precedence. The auditor follows this order for supported Markdown paths. Other README formats and unusual capitalisation are outside this initial implementation.

The onboarding check only recognises a few English heading hints. Missing hints produce manual review, never an automatic content defect. Review equivalent wording and whether the commands actually form a complete sequence.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
