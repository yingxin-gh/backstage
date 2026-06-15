---
'@backstage/cli-node': patch
---

Added `runCli` for creating executable CLI packages from a fixed collection of directly imported CLI modules, with validation for conflicting command paths. The single-module `runCliModule` helper is now deprecated.
