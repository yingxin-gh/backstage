---
'@backstage/core-compat-api': patch
---

Removed `zod` from `dependencies` where it was only used in tests. Kept `@backstage/types` in `dependencies` as it is transitively required at runtime.
