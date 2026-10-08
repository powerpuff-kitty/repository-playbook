# Document deployment and recovery boundaries

Describe the minimum local environment, required configuration and first observable success. Supply safe example values and name secrets without including them. Make clear which values are client-visible and which must remain server-side.

Explain deployment, migrations and rollback for the actual application. A static site does not need invented database recovery instructions; an application with durable user data does. Include failure behaviour and compatibility expectations that affect operators.

Separate a development preview from a production service. Document authentication, data storage and external dependencies where they affect use. A demo screenshot should not imply that production hosting or monitoring exists.

Before a public launch, review backups, restore exercises, dependency support and the private security reporting route. Attach operational evidence instead of claiming readiness from documentation presence. The initial application checks intentionally remain manual because a generic filesystem scan cannot verify deployment safety or successful recovery.

## Basis and references

These are playbook recommendations, not universal platform requirements. [Primary reference](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories). See the rule catalogue for applicability and verification limits.

[Back to the playbook](../README.md)
