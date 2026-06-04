---
'@backstage/plugin-scaffolder-backend': patch
---

Restored user-supplied task secrets in scaffolder dry-run executions. The previous security fix that stripped secrets from dry-run also removed task secrets passed in the dry-run request body, which broke integration test setups that rely on user-supplied secrets. Environment secrets (server-configured) remain stripped during dry-run; only task secrets supplied by the caller are now forwarded to actions.
