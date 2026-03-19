---
'@backstage/frontend-plugin-api': patch
---

Removed the `defineParams` callback from `PluginHeaderActionBlueprint`. Params are now typed inline on the factory, matching the pattern used by `PageBlueprint`, `SubPageBlueprint`, and others.
