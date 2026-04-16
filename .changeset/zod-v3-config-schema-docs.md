---
'@backstage/frontend-plugin-api': patch
---

Updated error messages and deprecation warnings to clarify that the `zod/v4` subpath export from the Zod v3 package is not supported by `configSchema`, since it does not include JSON Schema conversion. A full migration to the `zod` v4 package (`zod@^4.0.0`) is required.
