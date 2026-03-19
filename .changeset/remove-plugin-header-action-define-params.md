---
'@backstage/frontend-plugin-api': minor
---

**BREAKING**: Removed the `defineParams` callback from `PluginHeaderActionBlueprint`. Params are now typed inline on the factory, matching the pattern used by `PageBlueprint`, `SubPageBlueprint`, and others. To migrate, change `params: defineParams => defineParams({ ... })` to `params: { ... }` when calling `PluginHeaderActionBlueprint.make(...)`.
