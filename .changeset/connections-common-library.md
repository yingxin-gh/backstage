---
'@backstage/connections': minor
---

Changed `@backstage/connections` into a common library so its connection types, schemas, and service contract can be used by isomorphic packages. Backend service APIs have moved to `@backstage/connections-backend`; update imports of `connectionsServiceRef`, `connectionsServiceFactory`, `DefaultConnectionsService`, and `declareConnection` to use the new package. Note that backend-only configuration types such as `RootConnection`/`AnyRootConnection` are no longer exported from `@backstage/connections` as part of this split.
