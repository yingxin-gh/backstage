---
'@backstage/plugin-app': minor
---

**BREAKING** Changed the default discovery API implementation to use `FrontendHostDiscovery`, which supports the `discovery.endpoints` configuration for per-plugin endpoint overrides. Note that this will start honoring `discovery.endpoints` (including string `target` values), so if you currently use internal-only targets there, update them to the object form and move the internal URL to `target.internal`, omitting `target.external` (or setting it to a browser-reachable URL) to avoid routing the frontend to internal URLs.
