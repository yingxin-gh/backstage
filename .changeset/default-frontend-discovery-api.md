---
'@backstage/plugin-app': patch
---

Changed the default discovery API implementation to use `FrontendHostDiscovery`, which supports the `discovery.endpoints` configuration for per-plugin endpoint overrides. This aligns the new frontend system with the old frontend system's default behavior.
