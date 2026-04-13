---
'@backstage/backend-plugin-api': patch
---

Harmonized the phantom `.T` getter behavior on `ExtensionPoint` and `ServiceRef` to consistently return `null` instead of throwing, and added `toJSON()` parity for `ExtensionPoint`.
