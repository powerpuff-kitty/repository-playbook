# Security policy

## Reporting

Do not post exploit details, secrets, private repository contents or personal information in public issues. Use GitHub private vulnerability reporting **only if the repository owner has enabled it**. That setting has not been configured or verified by this implementation.

If private reporting is unavailable and no existing private maintainer contact is known, open an issue titled `Private security contact requested` with no technical details. Maintainers must establish and verify a confidential route before a broad public release. No response-time guarantee is claimed.

## Scope and supported versions

The current experimental 0.4.x code is the only supported line. The tool is a bounded static reader, not a sandbox or a security certification. Audit stable local copies. The offline scanner never executes target code, makes network requests, invokes Git or writes to the target. The separate, explicitly enabled GitHub adapter makes bounded read-only GET requests to `api.github.com`; it never uploads local contents or writes to GitHub. See [the adapter contract](handbook/github-api.md) for permissions and evidence limits.

Report path-boundary escapes, unsafe execution, unbounded input handling, misleading evidence promotion or report injection. Provide a minimal synthetic fixture privately after a channel is established. Never supply real credentials or sensitive repository data.
