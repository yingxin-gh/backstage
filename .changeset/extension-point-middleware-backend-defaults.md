---
'@backstage/backend-defaults': patch
---

Added `extensionPointFactoryMiddleware` option to `createBackend()` to reimplement extension point outputs at backend initialization time. Also re-exports `ExtensionPointFactoryMiddleware` type and `createExtensionPointFactoryMiddleware` helper from `@backstage/backend-app-api`.
