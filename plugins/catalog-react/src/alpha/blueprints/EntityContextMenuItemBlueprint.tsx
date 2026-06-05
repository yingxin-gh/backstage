/*
 * Copyright 2025 The Backstage Authors
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

import { ReactNode, JSX } from 'react';
import {
  coreExtensionData,
  createExtensionBlueprint,
  ExtensionBoundary,
} from '@backstage/frontend-plugin-api';
import { MenuItem } from '@backstage/ui';
import { makeStyles } from '@material-ui/core/styles';
import {
  FilterPredicate,
  filterPredicateToFilterFunction,
  createZodV4FilterPredicateSchema,
} from '@backstage/filter-predicates';
import type { Entity } from '@backstage/catalog-model';
import { entityFilterFunctionDataRef } from './extensionData';

const useStyles = makeStyles({
  menuItem: {
    '& .MuiSvgIcon-root': {
      fontSize: '1rem',
      width: '1rem',
      height: '1rem',
    },
  },
});

/** @alpha */
export type UseProps = () =>
  | {
      title: ReactNode;
      href: string;
      disabled?: boolean;
    }
  | {
      title: ReactNode;
      onClick: () => void | Promise<void>;
      disabled?: boolean;
    };

/** @alpha */
export type EntityContextMenuItemParams = {
  useProps: UseProps;
  icon: JSX.Element;
  filter?: FilterPredicate | ((entity: Entity) => boolean);
};

/** @alpha */
export const EntityContextMenuItemBlueprint = createExtensionBlueprint({
  kind: 'entity-context-menu-item',
  attachTo: { id: 'page:catalog/entity', input: 'contextMenuItems' },
  output: [
    coreExtensionData.reactElement,
    entityFilterFunctionDataRef.optional(),
  ],
  dataRefs: {
    filterFunction: entityFilterFunctionDataRef,
  },
  configSchema: {
    filter: createZodV4FilterPredicateSchema().optional(),
  },
  *factory(params: EntityContextMenuItemParams, { node, config }) {
    const loader = async () => {
      const Component = () => {
        const classes = useStyles();
        const { title, disabled, ...menuItemProps } = params.useProps();

        if ('href' in menuItemProps) {
          return (
            <MenuItem
              className={classes.menuItem}
              iconStart={params.icon}
              href={menuItemProps.href}
              isDisabled={disabled}
            >
              {title}
            </MenuItem>
          );
        }

        return (
          <MenuItem
            className={classes.menuItem}
            iconStart={params.icon}
            onAction={menuItemProps.onClick}
            isDisabled={disabled}
          >
            {title}
          </MenuItem>
        );
      };

      return <Component />;
    };

    yield coreExtensionData.reactElement(ExtensionBoundary.lazy(node, loader));

    if (config.filter) {
      yield entityFilterFunctionDataRef(
        filterPredicateToFilterFunction(config.filter),
      );
    } else if (typeof params.filter === 'function') {
      yield entityFilterFunctionDataRef(params.filter);
    } else if (params.filter) {
      yield entityFilterFunctionDataRef(
        filterPredicateToFilterFunction(params.filter),
      );
    }
  },
});
