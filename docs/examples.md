# Examples

The canonical deployable example is
[`relazio-plugin-example`](https://github.com/rstlgu/relazio-plugin-example).
It includes encrypted persistent storage, personalized manifests, Docker,
Compose, synchronous transforms, and asynchronous webhook delivery.

The `examples/` directory in this repository contains transform-authoring
snippets for builders, entity creation, DNS logic, and progress reporting.
Those snippets are not production deployment templates.

Production addons must use the server setup from the root
[README](../README.md):

- persistent `InstallationStorage`;
- a strong `ADDON_INSTALL_TOKEN`;
- HTTPS `PUBLIC_URL`;
- shared `RequestReplayStore` for multiple replicas;
- transform tests and production dependency audits.

Transform routes reject unsigned curl requests. Full integration tests should
install a personalized manifest into a Relazio development environment.
