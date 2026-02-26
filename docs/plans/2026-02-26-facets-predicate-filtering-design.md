# Predicate-based filtering for the catalog facets endpoint

## Problem

The `/entity-facets` endpoint only supports the old filter query parameter syntax. The `queryEntities` endpoint already has a POST variant that accepts predicate-based filtering (`$all`, `$any`, `$not`, `$exists`, `$in`, `$contains`, `$hasPrefix`). We need the same capability for facets.

## Approach

Mirror the pattern from `queryEntities`: add a POST variant of `/entity-facets` that accepts a JSON body with a `query` predicate, while keeping the existing GET endpoint for backward compatibility.

## Changes

### Client types (`packages/catalog-client/src/types/api.ts`)

Add optional `query: FilterPredicate` field to `GetEntityFacetsRequest`. When both `filter` and `query` are provided, the client converts `filter` to a predicate and merges them with `$all`.

### Client implementation (`packages/catalog-client/src/CatalogClient.ts`)

If `query` is present, route to a new private method that POSTs to `/entity-facets`. Otherwise, use existing GET endpoint.

### OpenAPI schema (`plugins/catalog-backend/src/schema/openapi.yaml`)

Add POST operation `QueryEntityFacetsByPredicate` on `/entity-facets` with JSON body containing required `facets` array and optional `query` (JsonObject).

### Generated OpenAPI client

Add `queryEntityFacetsByPredicate` method.

### Backend internal types (`plugins/catalog-backend/src/catalog/types.ts`)

Add optional `query?: FilterPredicate` to `EntityFacetsRequest`.

### Backend router (`plugins/catalog-backend/src/service/createRouter.ts`)

Add POST handler that validates the query predicate with zod and calls `entitiesCatalog.facets`.

### DefaultEntitiesCatalog.facets

Pass `query` through to `applyEntityFilterToQuery` alongside existing `filter`.

### AuthorizedEntitiesCatalog.facets

No changes needed — permission conditions merge into `filter` only.
