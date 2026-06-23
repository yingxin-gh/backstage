---
'@backstage/plugin-events-backend-module-azure': patch
---

Added HTTP POST webhook ingress endpoint for Azure DevOps events, matching the pattern established by the GitHub events module. When `events.modules.azureDevOps.webhookSecret` is configured, incoming requests are validated using Basic authentication.
