---
'@backstage/plugin-auth-backend-module-auth0-provider': minor
---

Sign-out now redirects the browser to Auth0's `/v2/logout` endpoint, clearing the Auth0 session cookie so that users must re-authenticate on next sign-in. Previously, only the Backstage session was cleared, allowing users to sign back in without re-entering credentials.

Set `federatedLogout: true` in the Auth0 provider config to additionally clear the upstream IdP session (e.g. Okta, Google), requiring full re-authentication across the entire SSO chain.
