---
'@backstage/plugin-auth-node': minor
---

Added `OAuthAuthenticatorLogoutResult` type. The `logout` method on `OAuthAuthenticator` can now optionally return `{ logoutUrl }` to trigger a browser redirect after sign-out. This allows providers like Auth0 to clear their session cookies by redirecting to their logout endpoint.
