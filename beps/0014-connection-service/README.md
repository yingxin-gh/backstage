---
title: Connection Service
status: implementable
authors:
  - '@Rugvip'
owners:
  - '@backstage/maintainers'
project-areas:
  - framework
creation-date: 2026-03-30
---

# BEP: Connection Service

- [Summary](#summary)
- [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-Goals](#non-goals)
- [Proposal](#proposal)
  - [Configuration Format](#configuration-format)
  - [Connection Service](#connection-service)
  - [Querying Connections](#querying-connections)
  - [Defining Connection Types](#defining-connection-types)
  - [Connection Type Evolution](#connection-type-evolution)
  - [Catalog Entity Annotations](#catalog-entity-annotations)
  - [Frontend Discovery](#frontend-discovery)
  - [Override Capability](#override-capability)
  - [Custom Connection Types](#custom-connection-types)
- [Design Details](#design-details)
  - [ConnectionsService Interface](#connectionsservice-interface)
  - [ConnectionType Interface](#connectiontype-interface)
  - [Connection Interface](#connection-interface)
  - [ConnectionResult](#connectionresult)
  - [URL Matching and Indexing](#url-matching-and-indexing)
  - [Configuration Schema](#configuration-schema)
  - [Entity Annotation Resolution](#entity-annotation-resolution)
  - [Credential APIs on Top of Connections](#credential-apis-on-top-of-connections)
  - [Backward Compatibility](#backward-compatibility)
- [Release Plan](#release-plan)
- [Dependencies](#dependencies)
- [Alternatives](#alternatives)

## Summary

This BEP proposes a **Connection Service** for Backstage — a centralized system for configuring and querying connections to external services. It replaces the current `integrations` configuration and `ScmIntegrations` API with a new `connections` configuration key and `coreServices.connections` backend service.

Connections provide static, typed data about configured external services: what they are, where they live (hosts, API endpoints, regions), and what authentication material is available (tokens, app credentials, service account keys). Connections are pure configuration data — they do not perform dynamic operations like token exchange or credential refresh. Dynamic credential resolution (e.g. GitHub App installation tokens, Azure OAuth flows) is left to type-specific APIs that can be built on top of connections separately.

Each connection type defines base fields (host, API endpoints) and one or more authentication methods as first-class primitives. The `find` method selects both the best connection and the best auth method in one step, returning a single connection with a single selected auth object. The service supports querying by URL with specificity beyond host matching, querying by type, and always returns a standardized result — a missing connection is never an error. The service can be overridden at the app level, and adopters can register custom connection types.

## Motivation

The current integrations system in Backstage has served the project well, but several pain points have emerged as the ecosystem has grown.

**Scattered initialization.** Every backend plugin that needs connection information independently calls `ScmIntegrations.fromConfig(config)`. There is no shared instance, which means the same configuration is parsed repeatedly, and there is no central point where connections can be augmented, filtered, or monitored.

**No override capability.** Adopters cannot customize how connections are provided to different plugins. For example, there is no way to restrict which GitHub organizations a particular plugin can access, or to inject additional credentials per plugin without forking the plugin itself.

**Primitive lookup.** The current `byHost` lookup is insufficient for real-world scenarios. When multiple GitHub Apps are configured for different organizations on the same host, or when different credentials should be used for different paths on the same GitLab instance, host-based matching alone cannot express the routing.

**Tangled static and dynamic concerns.** The current `ScmIntegrations` class mixes static configuration access with dynamic operations. `DefaultGithubCredentialsProvider` handles installation token exchange separately from the integration object but must be instantiated from the same config. `DefaultAzureDevOpsCredentialsProvider` does the same for Azure OAuth/managed identity flows. `DefaultAwsCredentialsManager` reads from a separate `aws` config key entirely. There is no consistent pattern for where static config ends and dynamic credential resolution begins.

**No path for evolution.** When an external service makes breaking changes to its API or authentication, there is no mechanism to roll out a new connection format alongside the old one.

**Ecosystem fragmentation.** The current integrations system only covers a handful of SCM and storage providers. The vast majority of plugins in the Backstage ecosystem that connect to external services — Jira, PagerDuty, Datadog, SonarQube, Jenkins, Sentry, and many others — each define their own connection configuration in their plugin-specific config schema. A Jira plugin has `jira.host` and `jira.token`, a PagerDuty plugin has `pagerduty.apiUrl` and `pagerduty.eventsBaseUrl`, and so on. There is no shared connection registry that these plugins can draw from, no way for an adopter to see all configured external connections in one place, and no opportunity for connection reuse across plugins that talk to the same service.

**No catalog integration.** Annotations like `github.com/project-slug` and `jenkins.io/job-full-name` already link catalog entities to external resources, but there is no formal association between these annotations and the connection configuration. Each plugin handles annotation resolution independently, and there is no common pattern for mapping an entity's annotations to the right connection.

**Misleading naming and scope.** The `ScmIntegrations` class includes non-SCM connections such as AWS S3, Google GCS, and Azure Blob Storage.

### Goals

- Introduce a backend core service (`coreServices.connections`) that provides centralized access to static connection configuration.
- Focus connections on identification and authentication material — hosts, API endpoints, resource identifiers, regions, tokens, app credentials, keys — as static data.
- Provide a query API where connections can be looked up by URL (with specificity beyond host matching), by type, or with additional type-specific context.
- Ensure querying is always safe — a missing connection returns a result indicating absence, never an error.
- Allow connection type definitions to evolve over time.
- Define all built-in connection types in a single central `@backstage/*` package.
- Allow adopters to override the connection service at the app level.
- Allow adopters to register custom connection types internally, via the connection service override.
- Provide a backend API endpoint for frontend discovery of configured connection metadata.
- Document the relationship between existing catalog entity annotations (e.g. `github.com/project-slug`) and connection types, leveraging their shared host-based namespace.

### Non-Goals

- This BEP does not define type-specific credential APIs (e.g. GitHub App token exchange, Azure OAuth flows). Those are built on top of connections and are outside the scope of this proposal.
- This BEP does not cover content-level operations like URL resolution or edit URL generation — those are higher-level concerns that build on top of connections.
- This BEP does not propose changes to the URL reader service, though it will be updated to consume connections.
- This BEP does not cover dynamic credential rotation or external secrets management.
- This BEP does not cover user-level authentication or access delegation.
- Connection types are not extensible by ecosystem plugins. New connection types can only be added to the central Backstage package or by adopters in their own app. This ensures a single canonical set of definitions with a predictable evolution path.

## Proposal

### Configuration Format

Connections are configured as a flat array under the `connections` key in `app-config.yaml`. Each entry has a `type` field that identifies the kind of external service:

```yaml
connections:
  - type: github
    host: github.com
    apiBaseUrl: https://api.github.com
    rawBaseUrl: https://raw.githubusercontent.com
    auth:
      - method: token
        token: ${GITHUB_TOKEN}
      - method: app
        appId: 12345
        privateKey: ${GH_APP_PRIVATE_KEY}
        clientId: ${GH_APP_CLIENT_ID}
        clientSecret: ${GH_APP_CLIENT_SECRET}
        allowedOwners:
          - my-org
          - partner-org
      - method: app
        appId: 67890
        privateKey: ${GH_APP_2_KEY}
        clientId: ${GH_APP_2_CLIENT_ID}
        clientSecret: ${GH_APP_2_CLIENT_SECRET}
        allowedOwners:
          - internal-org
  - type: github
    host: ghe.example.com
    apiBaseUrl: https://ghe.example.com/api/v3
    auth:
      - method: token
        token: ${GHE_TOKEN}
  - type: gitlab
    host: gitlab.com
    auth:
      - method: token
        token: ${GITLAB_TOKEN}
  - type: azure
    host: dev.azure.com
    auth:
      - method: pat
        personalAccessToken: ${AZURE_TOKEN}
```

Each connection entry has a `type`, base fields like `host`, and an `auth` array listing one or more authentication methods. Each auth entry has a `method` discriminator and method-specific fields. The `find` method selects both the best connection and the best auth method for a given query — consumers receive a single connection with a single selected auth object.

**Auth method matching.** Each auth entry can optionally include a `match` block that controls when the entry is eligible for selection. The `match` key is reserved by the framework — auth method schemas cannot use it. Currently `match` supports `plugins`, which restricts the auth entry to specific plugin IDs:

```yaml
connections:
  - type: github
    host: github.com
    auth:
      # Only the catalog plugin can select this auth method
      - method: token
        token: ${GITHUB_CATALOG_TOKEN}
        match:
          plugins: [catalog]
      # All other plugins use the app
      - method: app
        appId: 12345
        privateKey: ${GH_APP_KEY}
        clientId: ${GH_APP_CLIENT_ID}
        clientSecret: ${GH_APP_CLIENT_SECRET}
```

When `find` selects an auth method, entries whose `match` criteria exclude the requesting plugin are removed from consideration. Auth methods without a `match` block are always eligible. Among eligible entries, those with a `match` that explicitly includes the requesting plugin are preferred over unmatched ones. This allows adopters to give different plugins different credentials or permission levels for the same connection without duplicating the connection entry or writing any code.

The `match` block is designed to evolve — future selection criteria can be added alongside `plugins` without changing auth method schemas or the overall config structure.

**Config merging.** Arrays in Backstage's config system are replaced wholesale when merging across config sources — they do not merge element-by-element. This means that if `connections` is defined in multiple config files, the last source wins. In practice this is acceptable because different environments (local dev, staging, production) typically define entirely different sets of connections. For the case where base config and secrets need to be split, the recommended approach is to use environment variable substitution within a single config file, or to use the `$include` directive.

### Connection Service

A new core service provides access to connections:

```typescript
export const connectionsServiceRef = createServiceRef<ConnectionsService>({
  id: 'core.connections',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        config: coreServices.rootConfig,
        plugin: coreServices.pluginMetadata,
      },
      factory({ config, plugin }) {
        return ConnectionsRegistry.fromConfig(config, {
          pluginId: plugin.getId(),
        });
      },
    }),
});
```

The service depends on `coreServices.pluginMetadata` so that auth method selection can apply `match` criteria. When `find` evaluates auth methods, entries whose `match.plugins` does not include the requesting plugin are excluded from selection. Auth methods without a `match` block are always eligible.

Added to `coreServices`:

```typescript
export const coreServices = {
  // ... existing services
  connections: connectionsServiceRef,
};
```

#### Connection Declarations

Before a plugin or module can access connections at runtime, it must declare which connection types it consumes. This is done by calling `env.registerConnection` for each type during the `register` phase:

```typescript
export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'github-provider',
  register(env) {
    env.registerConnection('github', {
      required: true,
      description: 'We need this to be able to display your stuff',
    });

    env.registerInit({
      deps: { connections: coreServices.connections },
      async init({ connections }) {
        const result = connections.find({
          type: 'github',
          authMethods: ['token', 'app'],
          url: 'https://github.com/my-org/my-repo',
        });

        if (result.connection) {
          const { host, apiBaseUrl, auth } = result.connection;
          // auth is narrowed to GithubTokenAuth | GithubAppAuth
        }
      },
    });
  },
});
```

The second argument is an optional options object with metadata about the declaration:

- **`required`** — Whether this connection is required for the module to function. When `true`, the framework can surface clear warnings or errors when no matching connection is configured. Defaults to `false`.
- **`description`** — A human-readable description of what the connection is used for, surfaced in documentation and management interfaces.

When no options are needed, the second argument can be omitted entirely, as shown in the multi-module example below.

The framework enforces declarations at two levels:

- **Startup validation.** If a module depends on `coreServices.connections` but did not call `env.registerConnection`, the framework throws at startup before any init code runs.
- **Runtime validation.** If a module calls `find` with a type that was not declared, the service throws immediately.

Each module declares its own connection requirements independently. The plugin's total set of declared types is the union of all its modules' declarations. This means a catalog plugin with a GitHub provider module and a GitLab provider module each declare only the types they need:

```typescript
// catalog-backend-module-github
register(env) {
  env.registerConnection('github');
  // ...
}

// catalog-backend-module-gitlab
register(env) {
  env.registerConnection('gitlab');
  // ...
}
```

**Offline discoverability.** The `register` function is synchronous and side-effect-free — it runs before any async init logic. Tooling can load a module and execute `register` with a recording mock to extract declared connection types without running the plugin's actual implementation. Build tooling can also extract the declarations statically from source.

### Querying Connections

The connection service exposes a single query method with a required `type` field, which is validated against the module's declared types.

**`find` — best match:**

Returns the single best-matching connection for the given criteria. The caller must declare which auth methods it supports via the required `authMethods` parameter:

```typescript
const result = connections.find({
  type: 'github',
  authMethods: ['token', 'app'],
  url: 'https://github.com/my-org/my-repo',
});
// result.connection is GithubConnection | undefined
// result.connection.auth is narrowed to GithubTokenAuth | GithubAppAuth
```

The `find` method selects both the connection and the auth method in one step. If a GitHub connection has multiple auth entries (a PAT and two apps), `find` picks the connection whose host matches and the auth entry that best matches the URL — for example, the app whose `allowedOwners` includes the URL's organization.

**Auth method enforcement.** The `authMethods` parameter is not a filter — it is a declaration of what the caller can handle. If the best-matching auth method for a connection is one the caller did not list, `find` throws an error rather than silently skipping it. This ensures that when a new auth method is configured, consumers that encounter it are forced to explicitly add support rather than silently losing access to the connection:

```typescript
// If the best match for this URL is a 'fine-grained-pat' auth entry
// but the caller only listed ['token', 'app'], find() throws:
//   "Connection 'github' at 'github.com' matched auth method
//    'fine-grained-pat' which is not in the caller's supported
//    authMethods: ['token', 'app']"
```

If no connection matches the type and URL at all, `find` returns `undefined` as usual — the error only occurs when a connection exists but the caller cannot handle its auth method.

**Always-optional results:**

The `find` method never throws for a missing connection. It returns a `ConnectionResult` with `connection` set to `undefined`:

```typescript
const result = connections.find({
  type: 'github',
  authMethods: ['token', 'app'],
  url: 'https://unknown-host.example.com/path',
});

if (!result.connection) {
  logger.info('No GitHub connection configured, skipping sync');
  return;
}
```

### Defining Connection Types

Each connection type is defined using `createConnectionType`, which captures the full definition: base config validation, auth methods, output shape, and URL matching. The definition uses Zod schemas as the source of truth for both base fields and auth methods.

The `createConnectionType` function produces a `ConnectionType` object that the registry uses internally. Consumers of the connection service never interact with this object — they work with the output type produced by the schema.

**What each piece does:**

- **`type`** — the discriminator string used in config and queries. The framework adds `type` to the output automatically.
- **`configSchema`** — a Zod schema for the base connection fields shared across all auth methods (e.g. `host`, `apiBaseUrl`). The pre-transform shape defines the config input; `.transform()` derives computed defaults. Must include `host` in both input and output.
- **`authMethods`** — an array of auth method definitions, each with a `method` string discriminator and its own `configSchema` (Zod). Auth methods can also provide a `matchUrl` function for auth-specific URL scoring (e.g. matching `allowedOwners` on a GitHub App).
- **`matchUrl(connection, url)`** — optional, at the connection level. Scores a connection against a URL for `find()` ranking among same-host, same-type candidates. Returns a number: `0` for host-only match, higher for more specific matches, `-1` to explicitly reject. When omitted, the default implementation returns `0` (host-only matching). Auth-level `matchUrl` is evaluated separately to select the best auth method within a connection.

**Guidance: always include base URLs.** Connection type definitions should include one or more base URL fields on the output type (e.g. `apiBaseUrl`, `rawBaseUrl`), even for services that are typically accessed via a single well-known domain. Deriving sensible defaults from the `host` via `.transform()` makes it zero-configuration for the common case while allowing adopters to override any base URL — for example, to route traffic through a reverse proxy or an internal gateway. Consumers of connections should always use the connection's base URLs for HTTP requests, never construct URLs from `host` directly. The specific base URL fields vary by connection type, but every type should provide at least one.

#### Full Example: GitHub Connection Type

```typescript
import { createConnectionType } from '@backstage/backend-plugin-api';
import { z } from 'zod';

export const githubConnectionType = createConnectionType({
  type: 'github',

  configSchema: z
    .object({
      host: z.string(),
      apiBaseUrl: z.string().optional(),
      rawBaseUrl: z.string().optional(),
    })
    .transform(input => {
      const isPublic = input.host === 'github.com';
      return {
        ...input,
        apiBaseUrl:
          input.apiBaseUrl ??
          (isPublic
            ? 'https://api.github.com'
            : `https://${input.host}/api/v3`),
        rawBaseUrl:
          input.rawBaseUrl ??
          (isPublic
            ? 'https://raw.githubusercontent.com'
            : `https://${input.host}/raw`),
      };
    }),

  authMethods: [
    {
      method: 'token',
      configSchema: z.object({
        token: z.string(),
      }),
    },
    {
      method: 'app',
      configSchema: z
        .object({
          appId: z.union([z.number(), z.string()]),
          privateKey: z.string(),
          clientId: z.string(),
          clientSecret: z.string(),
          webhookSecret: z.string().optional(),
          allowedOwners: z.array(z.string()).optional(),
        })
        .transform(app => ({
          ...app,
          appId: typeof app.appId === 'string' ? Number(app.appId) : app.appId,
        })),
      matchUrl(auth, url) {
        const owner = url.pathname.split('/')[1];
        if (!owner || !auth.allowedOwners?.length) {
          return 0;
        }
        if (auth.allowedOwners.includes(owner)) {
          return 100;
        }
        return -1;
      },
    },
  ],
});

// The output type that consumers receive from find():
export interface GithubConnection extends ResolvedConnection {
  readonly type: 'github';
  readonly host: string;
  readonly apiBaseUrl: string;
  readonly rawBaseUrl: string;
  readonly auth: GithubTokenAuth | GithubAppAuth;
}

export interface GithubTokenAuth {
  readonly method: 'token';
  readonly token: string;
}

export interface GithubAppAuth {
  readonly method: 'app';
  readonly appId: number;
  readonly privateKey: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly webhookSecret?: string;
  readonly allowedOwners?: readonly string[];
}
```

The base `configSchema` handles fields shared across all auth methods — `host`, `apiBaseUrl`, `rawBaseUrl` — with `.transform()` filling in defaults. Each auth method defines its own schema independently, validated and transformed in isolation.

When `find` is called, the registry selects the best connection by host, then selects the best auth method within that connection. The `matchUrl` on the `app` auth method uses `allowedOwners` to score — when a URL's organization matches an app's allowed owners, that app is preferred. The result returned to the caller includes the base connection fields and a single `auth` object — the selected method.

Every connection output has a `matchUrl` method provided by the framework. The default implementation matches by host only. When a connection type or auth method provides its own `matchUrl`, it enables more specific scoring.

### Connection Type Evolution

Since all connection types are defined centrally and auth methods are first-class primitives, there are clean paths for evolving connection types over time.

**Adding a new auth method.** New auth methods can be added to an existing connection type. The definition change is purely additive — existing auth methods are unchanged:

```typescript
// Adding fine-grained PAT support to the GitHub connection type:
authMethods: [
  // ... existing token and app methods unchanged ...
  {
    method: 'fine-grained-pat',
    configSchema: z.object({
      token: z.string(),
      repositories: z.array(z.string()),
    }),
    matchUrl(auth, url) {
      // Match based on repository list
    },
  },
],
```

Existing consumers that call `find` with `authMethods: ['token', 'app']` are unaffected as long as the connections they encounter don't resolve to the new method. If an adopter configures `fine-grained-pat` as the auth method for a connection that an existing consumer queries, `find` throws — forcing the consumer to either add `'fine-grained-pat'` to their `authMethods` list and handle it, or for the adopter to also configure a `token` or `app` entry that the consumer supports. This ensures new auth methods are never silently ignored.

**Adding base fields.** New optional fields can be added to the base `configSchema` without affecting existing configs or consumers.

**New type for fundamentally different variants.** When a service evolves in a way that requires a fundamentally different base shape or consumer interaction pattern, it is better to introduce a new type:

```yaml
connections:
  - type: github
    host: github.com
    auth:
      - method: token
        token: ${GITHUB_TOKEN}

  # Hypothetical new API version with different base fields
  - type: github-v2
    host: github.com
    apiVersion: '2024-01-01'
    auth:
      - method: installation-token
        installationToken: ${GITHUB_V2_TOKEN}
```

Plugins that need the new API register `github-v2`. Plugins that work with both register both. The old `github` type is never broken.

**Choosing between the two.** Adding auth methods is the default path for new authentication mechanisms — the base connection shape stays the same, and consumers handle the auth variant they need. A new top-level type is only needed when the base fields or the fundamental interaction model changes. Since all types are centrally defined, the Backstage maintainers can make this judgment call.

### Catalog Entity Annotations

Existing Backstage entity annotations already follow a convention where the prefix is the provider's domain (e.g. `github.com/`, `gitlab.com/`, `sentry.io/`) and the suffix identifies the kind of resource. This means annotations like `github.com/project-slug` naturally share a namespace with connections — the host in the annotation matches the host in the connection configuration.

#### Annotation Conventions

Each connection type documents which annotations it recognizes and how their values map to resources that can be resolved through the connection service. The annotation prefix matches the connection's host, and the suffix identifies the kind of resource:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    github.com/project-slug: my-org/my-repo
    github.com/team-slug: my-org/maintainers
    jenkins.io/job-full-name: folder-name/my-service
    sentry.io/project-slug: my-org/my-service
    sonarqube.org/project-key: my-service
```

These annotations already exist today. The connection service does not introduce new annotation keys or any runtime annotation handling — the relationship between annotations and connections is purely a documentation pattern.

#### Documented Annotation Associations

The documentation for each connection type lists which annotation suffixes are conventionally associated with it:

| Connection type | Annotation                  | Value format               |
| --------------- | --------------------------- | -------------------------- |
| `github`        | `github.com/project-slug`   | `<owner>/<repo>`           |
| `github`        | `github.com/team-slug`      | `<org>/<team>`             |
| `github`        | `github.com/user-login`     | `<username>`               |
| `gitlab`        | `gitlab.com/project-slug`   | `<group>/<project>`        |
| `gitlab`        | `gitlab.com/project-id`     | `<numeric-id>`             |
| `jenkins`       | `jenkins.io/job-full-name`  | `[instance:]<folder-path>` |
| `sentry`        | `sentry.io/project-slug`    | `[org/]<project>`          |
| `sonarqube`     | `sonarqube.org/project-key` | `<project-key>`            |

For self-hosted instances, the annotation prefix uses the instance's host (e.g. `ghe.example.com/project-slug` for a GitHub Enterprise instance) — the same host configured in the connection entry.

#### Plugin Usage Pattern

A plugin that operates on an entity reads the provider-specific annotation and uses the connection service to find the right connection. The annotation value identifies the resource, while the connection provides authentication and API endpoints:

```typescript
function getGithubRepo(
  entity: Entity,
  connections: ConnectionsService,
): { connection: GithubConnection; slug: string } | undefined {
  const slug = entity.metadata.annotations?.['github.com/project-slug'];
  if (!slug) {
    return undefined;
  }
  const result = connections.find({
    type: 'github',
    authMethods: ['token', 'app'],
    url: `https://github.com/${slug}`,
  });
  if (!result.connection) {
    return undefined;
  }
  return { connection: result.connection, slug };
}
```

#### Self-Hosted Instances and Annotation Prefixes

A key benefit of tying annotations to connection hosts is that self-hosted instances use their own host as the annotation prefix. An entity on GitHub Enterprise uses `ghe.example.com/project-slug` rather than `github.com/project-slug`, which naturally routes to the correct connection:

```yaml
annotations:
  ghe.example.com/project-slug: internal-org/internal-repo
```

This resolves to the connection configured with `host: ghe.example.com` without any special mapping logic.

### Frontend Discovery

A backend API endpoint exposes non-secret connection metadata:

```
GET /api/connections
```

```json
{
  "connections": [
    { "type": "github", "host": "github.com" },
    { "type": "github", "host": "ghe.example.com" },
    { "type": "gitlab", "host": "gitlab.com" }
  ]
}
```

### Override Capability

Auth method matching via the `match` block covers the common case of giving different plugins different credentials. For more advanced customization, the entire connection service can be overridden at the app level:

```typescript
const backend = createBackend();

backend.add(
  createServiceFactory({
    service: coreServices.connections,
    deps: {
      config: coreServices.rootConfig,
      plugin: coreServices.pluginMetadata,
    },
    factory({ config, plugin }) {
      const registry = ConnectionsRegistry.fromConfig(config, {
        pluginId: plugin.getId(),
      });
      // Add dynamic connections, enforce additional policies, etc.
      return registry;
    },
  }),
);
```

### Custom Connection Types

All built-in connection types are defined in a single central `@backstage/*` package and shipped with the framework. Ecosystem plugins cannot define new connection types — they can only consume existing ones.

Adopters can define internal custom connection types for their own organization's needs using the same `createConnectionType` API:

```typescript
const artifactoryConnectionType = createConnectionType({
  type: 'artifactory',

  configSchema: z
    .object({
      host: z.string(),
      repository: z.string().optional(),
    })
    .transform(input => ({
      ...input,
      apiBaseUrl: `https://${input.host}/artifactory/api`,
    })),

  authMethods: [
    {
      method: 'token',
      configSchema: z.object({
        token: z.string(),
      }),
    },
  ],
});
```

Custom types are registered by passing them to the connection service factory as a single list of extra definitions. This naturally limits extension to a single point of control — there is no plugin-level extension mechanism:

```typescript
const backend = createBackend();

backend.add(
  createServiceFactory({
    service: coreServices.connections,
    deps: {
      config: coreServices.rootConfig,
      plugin: coreServices.pluginMetadata,
    },
    factory({ config, plugin }) {
      return ConnectionsRegistry.fromConfig(config, {
        pluginId: plugin.getId(),
        extraTypes: [artifactoryConnectionType],
      });
    },
  }),
);
```

Configured as:

```yaml
connections:
  - type: artifactory
    host: artifactory.example.com
    auth:
      - method: token
        token: ${ARTIFACTORY_TOKEN}
```

## Design Details

### `ConnectionsService` Interface

```typescript
interface ConnectionsService {
  find<T extends string, M extends string>(options: {
    type: T;
    authMethods: M[];
    url?: string | URL;
    [key: string]: unknown;
  }): ConnectionResult<T, M>;
}
```

The `find` method takes a single options object with a required `type` field. It validates the type against the module's declared connection types and throws if the type was not registered.

The `authMethods` array declares which auth methods the caller supports. `find` returns the best matching connection with the best auth method selected. If a connection matches but its best auth method is not in the caller's `authMethods` list, `find` throws — this is a configuration/code mismatch, not a missing connection. If no connection matches at all, the result is `undefined`.

### `ConnectionType` Interface

The public type produced by `createConnectionType`:

```typescript
interface ConnectionType<TOutput extends Connection = Connection> {
  readonly type: string;
  readonly jsonSchema: JsonObject;
  parse(data: unknown): TOutput;
  matchUrl?(connection: TOutput, url: URL): number;
  readonly authMethods: ReadonlyArray<{
    readonly method: string;
    readonly jsonSchema: JsonObject;
    parseAuth(data: unknown): ConnectionAuth;
    matchUrl?(auth: ConnectionAuth, url: URL): number;
  }>;
}
```

- **`type`** — the discriminator string.
- **`jsonSchema`** — automatically derived from the pre-transform shape of the base Zod `configSchema`. Merged into the overall config schema for validation and IDE support.
- **`parse(data)`** — validates and transforms the base fields through the Zod schema. Returns the base connection object (with `type` added by the framework). Throws on invalid input.
- **`matchUrl(connection, url)`** — optional. Scores a connection against a URL for `find()` ranking among same-host, same-type candidates.
- **`authMethods`** — the registered auth method definitions. Each has its own `jsonSchema`, `parseAuth`, and optional `matchUrl` for auth-level scoring.

The `createConnectionType` helper wires these together:

```typescript
function createConnectionType<TOutput extends Connection>(options: {
  type: string;
  configSchema: ZodType<unknown, unknown, TOutput>;
  matchUrl?: (connection: TOutput, url: URL) => number;
  authMethods: Array<{
    method: string;
    configSchema: ZodType;
    matchUrl?: (auth: any, url: URL) => number;
  }>;
}): ConnectionType<TOutput>;
```

The Zod schemas are the source of truth — base pre-transform shape produces the base JSON Schema, each auth method's pre-transform shape produces its JSON Schema. The Zod schemas themselves are not part of the public `ConnectionType` interface.

### `Connection` Interface

```typescript
interface Connection {
  readonly type: string;
  readonly host: string;
  matchUrl(url: string | URL): boolean;
}

interface ConnectionAuth {
  readonly method: string;
}

interface ResolvedConnection extends Connection {
  readonly auth: ConnectionAuth;
}
```

The base `Connection` interface requires `type` and `host`. The `ResolvedConnection` extends it with a single `auth` field — the selected auth method, a discriminated union with a `method` string and method-specific fields.

The `find` method returns a `ResolvedConnection` — a connection with the single best-matching auth method already selected.

The `match` block is not part of the connection or auth output types — it is a framework-level config concern handled during auth method selection. The `match` key is reserved by the framework on auth config entries and is stripped before the auth object is returned to consumers.

The `matchUrl` method lets callers check whether a given URL is covered by this connection. The default implementation matches by host. Connection types that provide a custom `matchUrl` in their definition get more specific logic.

All output properties are `readonly` — connections are immutable snapshots of configuration.

### `ConnectionResult`

```typescript
interface ConnectionResult<
  T extends string = string,
  M extends string = string,
> {
  connection: ResolvedConnectionOfType<T, M> | undefined;
}
```

Simple presence/absence. The caller decides how to handle a missing connection. The `connection` is a `ResolvedConnection` — it includes the base fields and the single selected `auth` method, narrowed to only the auth methods the caller declared.

`ResolvedConnectionOfType<T, M>` maps known type strings to their resolved subtypes, narrowing the `auth` union to only methods matching `M`:

```typescript
type ResolvedConnectionOfType<
  T extends string,
  M extends string = string,
> = T extends 'github'
  ? GithubConnectionResolved<M>
  : T extends 'gitlab'
  ? GitlabConnectionResolved<M>
  : T extends 'azure'
  ? AzureConnectionResolved<M>
  : ResolvedConnection;
```

For example, `GithubConnectionResolved<'token' | 'app'>` has `auth: GithubTokenAuth | GithubAppAuth`, while `GithubConnectionResolved<'token'>` narrows to `auth: GithubTokenAuth`.

### URL Matching and Indexing

The `ConnectionsRegistry` maintains a `Map<string, Connection[]>` indexed by hostname.

**Internal scoring (used by `find`).** When `find` is called with a URL:

1. Parse the URL and extract the hostname.
2. Look up all connections for that host — O(1).
3. Filter to the requested type (always provided).
4. For each candidate connection, score it using the connection-level `matchUrl` (default: `0` for host match).
5. For the winning connection, apply `match` criteria — exclude auth entries whose `match.plugins` does not include the requesting plugin. Auth methods without a `match` block are always eligible. Among eligible entries, those with an explicit `match` for the requesting plugin are preferred over unmatched ones.
6. Score each eligible auth method using the auth-level `matchUrl`. Auth methods without a `matchUrl` score `0`. Auth methods that return `-1` are excluded.
7. Select the highest-scoring auth method.
8. **Auth method enforcement.** If the selected auth method's `method` is not in the caller's `authMethods` list, throw an error. This is a configuration/code mismatch — the connection exists and has a matching auth method, but the caller has not declared support for it.
9. Return the connection with the selected auth method attached as `auth`.

The scoring functions return:

- `0` — matches by host only (fallback, and the default when no custom `matchUrl` is provided)
- `1-99` — partial match (e.g. group-level GitLab matching)
- `100+` — specific match (e.g. GitHub app whose `allowedOwners` includes the URL's owner segment)
- `-1` — does not match this URL despite sharing the host

For the common case of a single connection per host with a single auth method, no scoring is needed.

**`connection.matchUrl()` (used by callers).** Each connection object also exposes a `matchUrl(url)` method that callers can use directly to check whether a URL is covered by this connection. The default implementation matches by host. Connection types with a custom connection-level `matchUrl` in their definition get type-specific logic. Note that auth-level matching (e.g. checking `allowedOwners` on a GitHub App) is handled internally by `find` during auth selection — it does not affect the connection-level `matchUrl`.

When `find` is called with type-specific parameters (e.g. `connections.find({ type: 'github', authMethods: ['token', 'app'], host: 'github.com', owner: 'my-org' })`) instead of a URL, the connection type handles the matching directly.

### Configuration Schema

The overall config schema for the `connections` key is assembled automatically from the registered connection types. Each type's base `jsonSchema` (derived from its Zod `configSchema`) and its auth methods' JSON schemas are combined into the appropriate structure:

```typescript
export interface Config {
  connections?: Array<ConnectionConfigEntry>;
}
```

The `type` and `auth` fields are added by the framework to every entry — connection type authors define the base fields in `configSchema` and auth-specific fields in each auth method's `configSchema`. The `auth` array in config uses `method` as the discriminator across the type's registered auth methods. At runtime, `ConnectionsRegistry.fromConfig` reads each entry, parses the base fields and each auth entry through the appropriate schemas, and collects the results.

Within each `auth` entry, the `match` and `method` keys are reserved by the framework. The `match` block controls selection criteria (currently `plugins`) and is stripped before the auth object is passed to consumers. Auth method schemas cannot declare fields named `match` or `method` — these are managed by the framework exclusively.

### Entity Annotation Resolution

The association between annotations and connection types is a documentation convention only — there is no runtime annotation handling in the connection service. The full annotation key follows the pattern `<host>/<suffix>` (e.g. `github.com/project-slug`), where the host matches the connection's host.

Plugins that need to resolve annotations to connections do so explicitly. The annotation value identifies the resource, and the annotation prefix (the host) is used to construct a URL for `find`:

```typescript
const slug = entity.metadata.annotations?.['github.com/project-slug'];
if (slug) {
  const result = connections.find({
    type: 'github',
    authMethods: ['token', 'app'],
    url: `https://github.com/${slug}`,
  });
}
```

This naturally handles self-hosted instances — an entity with `ghe.example.com/project-slug` uses the annotation prefix as the host, routing to the correct connection.

### Credential APIs on Top of Connections

Connections are intentionally limited to static configuration data. Dynamic credential resolution — token exchange, caching, refresh, SDK credential chains — is handled by separate type-specific APIs built on top of connections. This mirrors the existing pattern where `DefaultGithubCredentialsProvider`, `DefaultAzureDevOpsCredentialsProvider`, and `DefaultAwsCredentialsManager` already exist as distinct APIs separate from `ScmIntegrations`.

With the connection service in place, these credential APIs would read from `coreServices.connections` instead of `ScmIntegrations.fromConfig(config)`. They could be wired as independent service refs with default factories, making each one separately overridable. For example, a GitHub credentials service would use `connections.find({ type: 'github', authMethods: ['token', 'app'], url })` to get the best connection and auth method, then handle token exchange for `app` auth methods (installation token negotiation) or pass through the token directly for `token` auth methods, caching tokens with appropriate expiry.

The design of these credential APIs is outside the scope of this BEP and will be addressed separately.

### Backward Compatibility

The old `integrations` configuration is still supported during a deprecation period. `ConnectionsRegistry.fromConfig` reads from `connections` when present, falling back to `integrations` when `connections` is absent.

```yaml
# Old format (deprecated, still supported)
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

# New format
connections:
  - type: github
    host: github.com
    auth:
      - method: token
        token: ${GITHUB_TOKEN}
```

Since the two formats use different top-level keys, they never conflict. When `integrations` is detected without a corresponding `connections` key, a deprecation warning is logged at startup.

The existing `ScmIntegrations` and `ScmIntegrationRegistry` types are preserved as deprecated wrappers that delegate to `ConnectionsService`.

## Release Plan

The rollout is split into phases:

**Phase 1: Connection service (non-breaking).** Introduce `ConnectionsRegistry`, `ConnectionsService`, `Connection`, and `coreServices.connections` with full backward compatibility for the old config format. `ScmIntegrations` is updated to delegate to the new service internally.

**Phase 2: Plugin migration.** Core plugins are migrated to use `coreServices.connections`. The URL reader service and existing credential providers are updated to consume connections.

**Phase 3: Deprecation.** `ScmIntegrations`, `ScmIntegrationRegistry`, and the `integrations` config key are formally deprecated.

**Phase 4: Removal.** Deprecated APIs and old config format support are removed.

## Dependencies

None.

## TODO

- **User-level auth and access delegation.** Connections are service-level configuration — how the backend authenticates to external services. Acting on behalf of a signed-in user (OAuth token exchange, user-scoped access tokens, forwarding user identity) is a distinct concern handled by auth providers. However, the two share underlying configuration: a GitHub App's client ID lives in a connection, and the same client ID is used for user OAuth. This section needs to articulate the boundary clearly, explain where the concerns overlap, and sketch how connections and auth providers could relate in the future. Currently listed as a non-goal but needs more thought.

## Alternatives

### Single-Layer Design with `getCredentials` on `Connection`

Each connection object could include a `getCredentials()` method directly, combining static config and dynamic credential resolution in one interface:

```typescript
interface Connection {
  type: string;
  host: string;
  getCredentials(opts?: { url?: string }): Promise<ConnectionCredentials>;
}
```

Simpler API surface — one object to work with instead of two. But this mixes static data with stateful operations (caching, refresh timers, SDK initialization), makes the connection object harder to serialize and test, and provides no way to override credential resolution independently of connection config.

### Named Entries Instead of Array

Using an object with named keys instead of an array:

```yaml
connections:
  github:
    public:
      host: github.com
      token: ${GITHUB_TOKEN}
```

Better config merging across sources — objects merge deeply while arrays replace. But adds structural complexity, and in practice different environments define entirely different sets of connections, making the merging benefit less important than the simplicity of a flat list.

### Keep `ScmIntegrations` and Add Service Wrappers

Wrap existing types in services without changing config format. Simpler to implement but misses the opportunity to separate static config from dynamic auth, fix the naming, and support config evolution.

### Per-Provider Service Refs for Connections

One connection service per type (`coreServices.githubConnections`, etc.). Better type safety but leads to service ref proliferation and makes generic code harder to write. The single `coreServices.connections` with a typed `find` method provides sufficient type safety through the `type` option, while `registerConnection` provides the declaration guarantee.

### Permission Declarations on Connection Registrations

The `env.registerConnection` options object could be extended with a `permissions` field — an informational list of permissions or scopes the module needs from the connection:

```typescript
env.registerConnection('github', {
  required: true,
  description: 'Used to discover and ingest repository data',
  permissions: ['repo:read', 'actions:read'],
});
```

This would help administrators understand what level of access each module expects and could be surfaced in connection management interfaces. Left out of the initial proposal to keep the declaration lightweight, but could be added as a backward-compatible extension if there is demand for permission-aware connection governance.

### `findAll` Method

A `findAll` method that returns all connections of a given type could be useful for listing configured hosts or for credential services that need to enumerate connections. However, no current requirement is believed to need this — every known use case is a targeted lookup for a specific connection and auth method, which `find` handles. Leaving `findAll` out of the initial API keeps the surface minimal and preserves maximum freedom to evolve the internal representation, matching behavior, and auth selection model without being constrained by a listing contract. If a concrete need arises, `findAll` can be added as a backward-compatible extension.
