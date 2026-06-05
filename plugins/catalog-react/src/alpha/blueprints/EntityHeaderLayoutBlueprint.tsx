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

import { Entity } from '@backstage/catalog-model';
import {
  FilterPredicate,
  createZodV4FilterPredicateSchema,
} from '@backstage/filter-predicates';
import {
  createExtensionBlueprint,
  createExtensionDataRef,
  ExtensionBoundary,
} from '@backstage/frontend-plugin-api';
import { type HeaderNavTabItem } from '@backstage/ui';
import { JSX } from 'react';
import { z } from 'zod/v4';
import {
  entityFilterExpressionDataRef,
  entityFilterFunctionDataRef,
} from './extensionData';
import { resolveEntityFilterData } from './resolveEntityFilterData';

/** @alpha */
export interface EntityHeaderLayoutProps {
  tabs: HeaderNavTabItem[];
  activeTabId?: string;
}

const entityHeaderLayoutComponentDataRef = createExtensionDataRef<
  (props: EntityHeaderLayoutProps) => JSX.Element
>().with({
  id: 'catalog.entity-header-layout.component',
});

/** @alpha */
export const EntityHeaderLayoutBlueprint = createExtensionBlueprint({
  kind: 'entity-header-layout',
  attachTo: { id: 'page:catalog/entity', input: 'headerLayouts' },
  output: [
    entityFilterFunctionDataRef.optional(),
    entityFilterExpressionDataRef.optional(),
    entityHeaderLayoutComponentDataRef,
  ],
  dataRefs: {
    filterFunction: entityFilterFunctionDataRef,
    filterExpression: entityFilterExpressionDataRef,
    component: entityHeaderLayoutComponentDataRef,
  },
  configSchema: {
    filter: z
      .union([z.string(), createZodV4FilterPredicateSchema()])
      .optional(),
  },
  *factory(
    {
      loader,
      filter,
    }: {
      filter?: string | FilterPredicate | ((entity: Entity) => boolean);
      loader: () => Promise<(props: EntityHeaderLayoutProps) => JSX.Element>;
    },
    { node, config },
  ) {
    yield* resolveEntityFilterData(filter, config, node);
    yield entityHeaderLayoutComponentDataRef(
      ExtensionBoundary.lazyComponent(node, loader),
    );
  },
});
