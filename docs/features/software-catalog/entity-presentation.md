---
id: entity-presentation
title: Entity Presentation
description: How to display entity names and control how entities are represented in the Backstage interface
---

The _Entity Presentation API_ controls how catalog entities are displayed
throughout the Backstage interface. Instead of rendering raw entity refs like
`component:default/my-service`, the API resolves a human-friendly display
name from fields such as `metadata.title` and `spec.profile.displayName`.

## Displaying entity names

There are several ways to display entity names, depending on context:

### `EntityDisplayName` component

The simplest option for React components. Renders a styled entity name with
an optional icon and tooltip:

```tsx
import { EntityDisplayName } from '@backstage/plugin-catalog-react';

<EntityDisplayName entityRef="component:default/my-service" />;
```

You can pass an entity ref string, an `Entity` object, or a
`CompoundEntityRef`. The component supports optional `hideIcon` and
`disableTooltip` props.

### `useEntityPresentation` hook

Use this hook when you need access to the raw presentation data in a React
component, for example to render the title in a custom layout:

```tsx
import { useEntityPresentation } from '@backstage/plugin-catalog-react';

function MyComponent({ entityRef }: { entityRef: string }) {
  const { primaryTitle, secondaryTitle, Icon } =
    useEntityPresentation(entityRef);

  return (
    <span>
      {Icon && <Icon fontSize="inherit" />}
      {primaryTitle}
    </span>
  );
}
```

The hook subscribes to the `EntityPresentationApi` and returns a snapshot
that may update over time as additional data is fetched in the background.

### Using the API directly

In contexts where hooks are not available, you can use the
`entityPresentationApiRef` API directly. The API provides two access
patterns:

- **`.snapshot`** for synchronous access (for example in sort comparators or
  filter callbacks):

```ts
import { entityPresentationApiRef } from '@backstage/plugin-catalog-react';

const title = entityPresentationApi.forEntity(entity, {
  defaultKind: 'Component',
}).snapshot.primaryTitle;
```

- **`.promise`** for async contexts (for example inside data loaders):

```ts
const presentation = await entityPresentationApi.forEntity(entity, {
  defaultKind: 'group',
}).promise;
const title = presentation.primaryTitle;
```

The `.snapshot` path uses cached data when available, so it performs well
even in tight loops like sorting. The `.promise` path resolves to a richer
presentation that may include data fetched from the catalog.

## Customizing entity presentation

To customize how entities are rendered, provide your own implementation of
the `EntityPresentationApi` interface and register it with the app's API
factory:

```ts
import {
  entityPresentationApiRef,
  type EntityPresentationApi,
} from '@backstage/plugin-catalog-react';
import { createApiFactory } from '@backstage/core-plugin-api';

const myPresentationApi: EntityPresentationApi = {
  forEntity(entityOrRef, context) {
    // Return an EntityRefPresentation with snapshot, update$, and promise
  },
};

createApiFactory({
  api: entityPresentationApiRef,
  deps: {},
  factory: () => myPresentationApi,
});
```

The presentation snapshot includes `primaryTitle`, an optional
`secondaryTitle` for tooltips, and an optional `Icon` component. You can
also emit updated snapshots over time via the `update$` observable.

## Migrating from `humanizeEntityRef`

The `humanizeEntityRef` and `humanizeEntity` functions are deprecated. They
only produce a shortened entity ref string and do not resolve display names
from `metadata.title` or `spec.profile.displayName`.

Replace them as follows:

| Old code                                              | Replacement                                                            |
| :---------------------------------------------------- | :--------------------------------------------------------------------- |
| `humanizeEntityRef(entity)` in JSX                    | `<EntityDisplayName entityRef={entity} />`                             |
| `humanizeEntityRef(entity)` in a React component      | `useEntityPresentation(entity).primaryTitle`                           |
| `humanizeEntityRef(entity)` in a sort/filter callback | `entityPresentationApi.forEntity(entity).snapshot.primaryTitle`        |
| `humanizeEntityRef(entity)` in an async loader        | `(await entityPresentationApi.forEntity(entity).promise).primaryTitle` |
| `humanizeEntity(entity, fallback)`                    | `useEntityPresentation(entity).primaryTitle`                           |
