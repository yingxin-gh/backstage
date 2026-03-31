---
'@backstage/plugin-auth-backend-module-auth0-provider': minor
---

Added federated logout support. On sign-out, the Auth0 authenticator now returns a logout URL that redirects the browser to Auth0's `/v2/logout?federated` endpoint, clearing both the Auth0 session and any upstream IdP session. This ensures users must fully re-authenticate after signing out.
