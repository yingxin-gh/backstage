---
'@backstage/backend-defaults': patch
---

Add a small startup-time logger.warn in `DefaultActionsRegistryService.register()` when an action is registered without an explicit `attributes` block.
