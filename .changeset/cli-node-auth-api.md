---
'@backstage/cli-node': minor
---

Added `CliAuth` class for managing CLI authentication state. This provides a class-based API with a static `create` method that resolves the currently selected (or explicitly named) auth instance, transparently refreshes expired access tokens, and exposes helpers for other CLI modules to authenticate with a Backstage backend.
