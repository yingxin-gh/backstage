---
'@backstage/plugin-auth-backend': patch
---

Hardened the OAuth redirect URI and client ID metadata document allowlist checks to compare URL components separately, preventing wildcard patterns from matching across URL host and path boundaries. Redirect URIs that contain embedded credentials are now rejected even when the host is allowed.
