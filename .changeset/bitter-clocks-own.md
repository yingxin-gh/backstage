---
'@backstage/backend-defaults': patch
---

Add a startup-time warning in `DefaultActionsRegistryService` when an action is registered without explicit attributes, or with only some of the `readOnly`, `destructive`, and `idempotent` attributes set.
