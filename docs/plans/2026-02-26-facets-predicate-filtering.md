# Facets Predicate Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add predicate-based filtering (`$all`, `$any`, `$not`, `$exists`, `$in`, `$contains`, `$hasPrefix`) to the catalog `/entity-facets` endpoint, mirroring the pattern already used by `/entities/by-query`.

**Architecture:** Add a POST variant of `/entity-facets` that accepts a JSON body with `query` (predicate) and `facets`. The client routes to POST when a `query` field is present, otherwise falls back to the existing GET endpoint. The backend validates the predicate with zod, then passes it through to `applyEntityFilterToQuery` which already supports both `filter` and `query`.

**Tech Stack:** TypeScript, Express, Knex, zod, OpenAPI

---

### Task 1: Backend internal types — add `query` to `EntityFacetsRequest`

**Files:**

- Modify: `plugins/catalog-backend/src/catalog/types.ts:118-137`

**Step 1: Add `query` field to `EntityFacetsRequest`**

In `plugins/catalog-backend/src/catalog/types.ts`, add an optional `query` field to `EntityFacetsRequest` after the existing `filter` field:

```typescript
export interface EntityFacetsRequest {
  filter?: EntityFilter;
  /** Predicate-based query for filtering entities. */
  query?: FilterPredicate;
  facets: string[];
  credentials: BackstageCredentials;
}
```

`FilterPredicate` is already imported at the top of this file from `@backstage/filter-predicates`.

**Step 2: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass (the new field is optional, so no callers break).

**Step 3: Commit**

```
feat(catalog): add query predicate field to EntityFacetsRequest
```

---

### Task 2: DefaultEntitiesCatalog — pass `query` through to filter application

**Files:**

- Modify: `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts:675-712`

**Step 1: Update the `facets` method to pass `query` to `applyEntityFilterToQuery`**

Change the filter application block (lines 689-696) from:

```typescript
if (request.filter) {
  applyEntityFilterToQuery({
    filter: request.filter,
    targetQuery: query,
    onEntityIdField: 'search.entity_id',
    knex: this.database,
  });
}
```

To:

```typescript
if (request.filter || request.query) {
  applyEntityFilterToQuery({
    filter: request.filter,
    query: request.query,
    targetQuery: query,
    onEntityIdField: 'search.entity_id',
    knex: this.database,
  });
}
```

**Step 2: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 3: Commit**

```
feat(catalog): support query predicates in DefaultEntitiesCatalog.facets
```

---

### Task 3: Backend router — add POST `/entity-facets` handler

**Files:**

- Modify: `plugins/catalog-backend/src/service/createRouter.ts:552-574`
- Create: `plugins/catalog-backend/src/service/request/parseEntityFacetsQuery.ts`

**Step 1: Create the request parser for POST facets**

Create `plugins/catalog-backend/src/service/request/parseEntityFacetsQuery.ts`:

```typescript
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { InputError } from '@backstage/errors';
import {
  createZodV3FilterPredicateSchema,
  FilterPredicate,
} from '@backstage/filter-predicates';
import { z } from 'zod/v3';
import { fromZodError } from 'zod-validation-error/v3';

const filterPredicateSchema = createZodV3FilterPredicateSchema(z);

export interface ParsedEntityFacetsQuery {
  facets: string[];
  query?: FilterPredicate;
}

export function parseEntityFacetsQuery(
  body: Record<string, unknown>,
): ParsedEntityFacetsQuery {
  // Parse facets
  if (!Array.isArray(body.facets) || body.facets.length === 0) {
    throw new InputError('Missing or empty facets parameter');
  }
  const facets = body.facets.filter(
    (f): f is string => typeof f === 'string' && f.length > 0,
  );
  if (facets.length === 0) {
    throw new InputError('Missing or empty facets parameter');
  }

  // Parse query predicate
  let query: FilterPredicate | undefined;
  if (body.query !== undefined) {
    if (
      typeof body.query !== 'object' ||
      body.query === null ||
      Array.isArray(body.query)
    ) {
      throw new InputError('Query must be an object');
    }
    const result = filterPredicateSchema.safeParse(body.query);
    if (!result.success) {
      throw new InputError(`Invalid query: ${fromZodError(result.error)}`);
    }
    query = result.data;
  }

  return { facets, query };
}
```

**Step 2: Add the POST handler in createRouter.ts**

After the existing `.get('/entity-facets', ...)` block (which ends around line 574), add a new `.post('/entity-facets', ...)` handler. Change line 574 from:

```typescript
      });
```

to:

```typescript
      })
      .post('/entity-facets', async (req, res) => {
        const auditorEvent = await auditor.createEvent({
          eventId: 'entity-facets',
          request: req,
        });

        try {
          const { facets, query } = parseEntityFacetsQuery(req.body ?? {});

          const response = await entitiesCatalog.facets({
            filter: undefined,
            query,
            facets,
            credentials: await httpAuth.credentials(req),
          });

          await auditorEvent?.success();

          res.status(200).json(response);
        } catch (err) {
          await auditorEvent?.fail({
            error: err,
          });
          throw err;
        }
      });
```

Add the import at the top of createRouter.ts, alongside the other request parser imports:

```typescript
import { parseEntityFacetsQuery } from './request/parseEntityFacetsQuery';
```

**Step 3: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 4: Commit**

```
feat(catalog): add POST /entity-facets endpoint with predicate support
```

---

### Task 4: Backend router tests — test the POST endpoint

**Files:**

- Modify: `plugins/catalog-backend/src/service/createRouter.test.ts`
- Create: `plugins/catalog-backend/src/service/request/parseEntityFacetsQuery.test.ts`

**Step 1: Write unit tests for `parseEntityFacetsQuery`**

Create `plugins/catalog-backend/src/service/request/parseEntityFacetsQuery.test.ts`:

```typescript
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { parseEntityFacetsQuery } from './parseEntityFacetsQuery';

describe('parseEntityFacetsQuery', () => {
  it('parses facets with no query', () => {
    expect(parseEntityFacetsQuery({ facets: ['kind'] })).toEqual({
      facets: ['kind'],
      query: undefined,
    });
  });

  it('parses facets with a simple query', () => {
    expect(
      parseEntityFacetsQuery({
        facets: ['spec.type'],
        query: { kind: 'Component' },
      }),
    ).toEqual({
      facets: ['spec.type'],
      query: { kind: 'Component' },
    });
  });

  it('parses facets with complex predicate query', () => {
    const query = {
      $all: [{ kind: 'Component' }, { 'spec.lifecycle': 'production' }],
    };
    expect(parseEntityFacetsQuery({ facets: ['spec.type'], query })).toEqual({
      facets: ['spec.type'],
      query,
    });
  });

  it('throws on missing facets', () => {
    expect(() => parseEntityFacetsQuery({})).toThrow(
      'Missing or empty facets parameter',
    );
  });

  it('throws on empty facets array', () => {
    expect(() => parseEntityFacetsQuery({ facets: [] })).toThrow(
      'Missing or empty facets parameter',
    );
  });

  it('throws on invalid query (not an object)', () => {
    expect(() =>
      parseEntityFacetsQuery({ facets: ['kind'], query: 'bad' }),
    ).toThrow('Query must be an object');
  });

  it('throws on invalid query (array)', () => {
    expect(() =>
      parseEntityFacetsQuery({ facets: ['kind'], query: [] }),
    ).toThrow('Query must be an object');
  });
});
```

**Step 2: Run the parser tests**

Run: `CI=1 yarn --cwd plugins/catalog-backend test src/service/request/parseEntityFacetsQuery.test.ts`
Expected: All tests pass.

**Step 3: Add route-level tests in `createRouter.test.ts`**

Add a new describe block for `POST /entity-facets` and `GET /entity-facets` to the existing test file. Find a suitable location (near end of the `'createRouter readonly disabled'` describe block, before its closing `}`). The test should exercise both the POST and GET routes using the mocked `entitiesCatalog.facets`.

Look at how other route tests are structured in the file (e.g. `POST /entities/by-query`) and follow the same pattern with `request(app).post(...)`.

**Step 4: Run the router tests**

Run: `CI=1 yarn --cwd plugins/catalog-backend test src/service/createRouter.test.ts`
Expected: All tests pass.

**Step 5: Commit**

```
test(catalog): add tests for POST /entity-facets endpoint
```

---

### Task 5: OpenAPI schema — add POST operation for `/entity-facets`

**Files:**

- Modify: `plugins/catalog-backend/src/schema/openapi.yaml:1160-1196`

**Step 1: Add POST operation to the `/entity-facets` path**

After the existing `get` operation block (which ends at line 1196 with `- $ref: '#/components/parameters/filter'`), add:

```yaml
post:
  operationId: QueryEntityFacetsByPredicate
  tags:
    - Entity
  description: Get entity facets using predicate-based filters.
  responses:
    '200':
      description: Ok
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/EntityFacetsResponse'
    '400':
      $ref: '#/components/responses/ErrorResponse'
    default:
      $ref: '#/components/responses/ErrorResponse'
  security:
    - {}
    - JWT: []
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          required:
            - facets
          properties:
            facets:
              type: array
              items:
                type: string
            query:
              $ref: '#/components/schemas/JsonObject'
```

**Step 2: Commit**

```
feat(catalog): add POST /entity-facets to OpenAPI schema
```

---

### Task 6: Generated OpenAPI client — add `queryEntityFacetsByPredicate` method

**Files:**

- Modify: `packages/catalog-client/src/schema/openapi/generated/apis/Api.client.ts`
- Create: `packages/catalog-client/src/schema/openapi/generated/models/QueryEntityFacetsByPredicateRequest.model.ts`

**Step 1: Create the request model**

Create `packages/catalog-client/src/schema/openapi/generated/models/QueryEntityFacetsByPredicateRequest.model.ts`:

```typescript
// ******************************************************************
// * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY. *
// ******************************************************************

/**
 * @public
 */
export interface QueryEntityFacetsByPredicateRequest {
  facets: Array<string>;
  /**
   * A type representing all allowed JSON object values.
   */
  query?: { [key: string]: any };
}
```

**Step 2: Add the request type and method to the API client**

In `packages/catalog-client/src/schema/openapi/generated/apis/Api.client.ts`:

Add the import near the other model imports:

```typescript
import { QueryEntityFacetsByPredicateRequest } from '../models/QueryEntityFacetsByPredicateRequest.model';
```

Add the request type alongside the other exported types (after `QueryEntitiesByPredicate`):

```typescript
export type QueryEntityFacetsByPredicate = {
  body: QueryEntityFacetsByPredicateRequest;
};
```

Add the method after the `getEntityFacets` method:

```typescript
  public async queryEntityFacetsByPredicate(
    // @ts-ignore
    request: QueryEntityFacetsByPredicate,
    options?: RequestOptions,
  ): Promise<TypedResponse<EntityFacetsResponse>> {
    const baseUrl = await this.discoveryApi.getBaseUrl(pluginId);

    const uriTemplate = `/entity-facets`;

    const uri = parser.parse(uriTemplate).expand({});

    return await this.fetchApi.fetch(`${baseUrl}${uri}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token && { Authorization: `Bearer ${options?.token}` }),
      },
      method: 'POST',
      body: JSON.stringify(request.body),
    });
  }
```

**Step 3: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 4: Commit**

```
feat(catalog): add queryEntityFacetsByPredicate to generated OpenAPI client
```

---

### Task 7: Client types — add `query` field to `GetEntityFacetsRequest`

**Files:**

- Modify: `packages/catalog-client/src/types/api.ts:261-323`

**Step 1: Add `query` field to `GetEntityFacetsRequest`**

Add after the existing `filter` field (line 299):

```typescript
  /**
   * If given, return only entities that match the given predicate query.
   *
   * @remarks
   *
   * Supports operators like `$all`, `$any`, `$not`, `$exists`, `$in`,
   * `$contains`, and `$hasPrefix`. When both `filter` and `query` are
   * provided, they are combined with `$all`.
   */
  query?: FilterPredicate;
```

`FilterPredicate` is already imported at the top of this file.

**Step 2: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 3: Commit**

```
feat(catalog): add query predicate to GetEntityFacetsRequest
```

---

### Task 8: Client implementation — route to POST when `query` is present

**Files:**

- Modify: `packages/catalog-client/src/CatalogClient.ts:478-491`

**Step 1: Update `getEntityFacets` to route to POST when `query` is present**

Replace the current `getEntityFacets` method (lines 478-491) with:

```typescript
  async getEntityFacets(
    request: GetEntityFacetsRequest,
    options?: CatalogRequestOptions,
  ): Promise<GetEntityFacetsResponse> {
    const { filter, query, facets } = request;

    // Route to POST endpoint if query predicate is provided
    if (query || filter) {
      return this.getEntityFacetsByPredicate(request, options);
    }

    return await this.requestOptional(
      await this.apiClient.getEntityFacets(
        {
          query: { facet: facets },
        },
        options,
      ),
    );
  }
```

**Step 2: Add the private `getEntityFacetsByPredicate` method**

Add after `getEntityFacets`:

```typescript
  /**
   * Get entity facets using predicate-based filters (POST endpoint).
   * @internal
   */
  private async getEntityFacetsByPredicate(
    request: GetEntityFacetsRequest,
    options?: CatalogRequestOptions,
  ): Promise<GetEntityFacetsResponse> {
    const { filter, query, facets } = request;

    let filterPredicate: FilterPredicate | undefined;
    if (query !== undefined) {
      if (
        typeof query !== 'object' ||
        query === null ||
        Array.isArray(query)
      ) {
        throw new InputError('Query must be an object');
      }
      filterPredicate = query;
    }
    if (filter !== undefined) {
      const converted = convertFilterToPredicate(filter);
      filterPredicate = filterPredicate
        ? { $all: [filterPredicate, converted] }
        : converted;
    }

    return await this.requestOptional(
      await this.apiClient.queryEntityFacetsByPredicate(
        {
          body: {
            facets,
            ...(filterPredicate && {
              query: filterPredicate as unknown as { [key: string]: any },
            }),
          },
        },
        options,
      ),
    );
  }
```

Make sure `InputError` is imported from `@backstage/errors` and `convertFilterToPredicate` is imported from `./utils` (check existing imports — `convertFilterToPredicate` is already used by `queryEntitiesByPredicate`).

**Step 3: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 4: Run existing client tests**

Run: `CI=1 yarn --cwd packages/catalog-client test`
Expected: All tests pass.

**Step 5: Commit**

```
feat(catalog): route facets requests to POST when query is present
```

---

### Task 9: Generate API reports and create changesets

**Files:**

- Create: `.changeset/<name>.md` (two changesets)

**Step 1: Run API reports**

Run: `yarn build:api-reports` in project root.

**Step 2: Create changeset for catalog-backend**

Create `.changeset/facets-predicate-backend.md`:

```markdown
---
'@backstage/plugin-catalog-backend': minor
---

Added support for predicate-based filtering on the `/entity-facets` endpoint via a new `POST` method. Supports `$all`, `$any`, `$not`, `$exists`, `$in`, `$contains`, and `$hasPrefix` operators.
```

**Step 3: Create changeset for catalog-client**

Create `.changeset/facets-predicate-client.md`:

```markdown
---
'@backstage/catalog-client': minor
---

Added support for the `query` field in `getEntityFacets` requests, enabling predicate-based filtering with `$all`, `$any`, `$not`, `$exists`, `$in`, `$contains`, and `$hasPrefix` operators.
```

**Step 4: Commit changesets and API reports**

```
chore: add changesets and API reports for facets predicate support
```

---

### Task 10: Final verification

**Step 1: Run type checker**

Run: `yarn tsc` in project root.
Expected: Should pass.

**Step 2: Run backend tests**

Run: `CI=1 yarn --cwd plugins/catalog-backend test`
Expected: All tests pass.

**Step 3: Run client tests**

Run: `CI=1 yarn --cwd packages/catalog-client test`
Expected: All tests pass.

**Step 4: Run linter**

Run: `yarn lint --fix` in project root.
Expected: Should pass.
