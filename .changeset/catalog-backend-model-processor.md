---
'@backstage/plugin-catalog-backend': minor
---

Added `ModelProcessor` that validates catalog entities against the compiled catalog model schemas, and integrated it into the `CatalogBuilder` and `CatalogPlugin`. This processor is only activated if you explicitly add catalog model sources to your backend; there is no functional change for regular catalog usage.
