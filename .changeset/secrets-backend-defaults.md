---
'@backstage/backend-defaults': patch
---

Updated `DefaultActionsRegistryService` to validate and forward secrets to action handlers. The invoke endpoint now accepts a wrapped body format `{ input, secrets }` while maintaining backward compatibility with the raw input format. Updated `DefaultActionsService` to include secrets in the invoke request body.
