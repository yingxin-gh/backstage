---
'@backstage/connections': minor
---

Changed `@backstage/connections` into a common library so its connection types, schemas, and service contract can be used by isomorphic packages. Backend service APIs have moved to `@backstage/connections-backend`; update imports of `connectionsServiceRef`, `connectionsServiceFactory`, `DefaultConnectionsService`, and `declareConnection` to use the new package.
