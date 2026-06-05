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
import {
  createExtensionTester,
  renderInTestApp,
} from '@backstage/frontend-test-utils';
import {
  EntityContextMenuItemBlueprint,
  type EntityContextMenuItemParams,
} from './EntityContextMenuItemBlueprint';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { Button, Menu, MenuTrigger } from '@backstage/ui';
import { useState } from 'react';

describe('EntityContextMenuItemBlueprint', () => {
  async function findMenuItem(title: string) {
    const menuItem = (await screen.findByText(title)).closest(
      '[role="menuitem"]',
    );
    expect(menuItem).not.toBeNull();
    return menuItem!;
  }

  function renderMenuItem(params: EntityContextMenuItemParams) {
    const extension = EntityContextMenuItemBlueprint.make({
      name: 'test',
      params,
    });

    renderInTestApp(
      <EntityProvider
        entity={{
          apiVersion: 'v1',
          kind: 'Component',
          metadata: { name: 'test' },
        }}
      >
        <MenuTrigger isOpen>
          <Button>Menu</Button>
          <Menu>{createExtensionTester(extension).reactElement()}</Menu>
        </MenuTrigger>
      </EntityProvider>,
    );
  }

  const data = [
    {
      icon: <span>Test</span>,
      useProps: () => ({
        title: 'Test',
        href: '/somewhere',
        component: 'a',
        disabled: true,
      }),
    },
    {
      icon: <span>Test</span>,
      useProps: () => ({
        title: 'Test',
        onClick: async () => {},
      }),
    },
  ];

  it.each(data)('should return an extension with sane defaults, %#', params => {
    const extension = EntityContextMenuItemBlueprint.make({
      name: 'test',
      params,
    });

    expect(extension).toMatchInlineSnapshot(`
      {
        "$$type": "@backstage/ExtensionDefinition",
        "T": undefined,
        "attachTo": {
          "id": "page:catalog/entity",
          "input": "contextMenuItems",
        },
        "configSchema": {
          "parse": [Function],
          "schema": [Function],
        },
        "disabled": false,
        "factory": [Function],
        "if": undefined,
        "inputs": {},
        "kind": "entity-context-menu-item",
        "name": "test",
        "output": [
          [Function],
          {
            "$$type": "@backstage/ExtensionDataRef",
            "config": {
              "optional": true,
            },
            "id": "catalog.entity-filter-function",
            "optional": [Function],
            "toString": [Function],
          },
        ],
        "override": [Function],
        "toString": [Function],
        "version": "v2",
      }
    `);
  });

  it('should render a menu item', async () => {
    renderMenuItem({
      icon: <span>Icon</span>,
      useProps: () => ({
        title: 'Test',
        onClick: () => {},
      }),
    });

    expect(await findMenuItem('Test')).toBeInTheDocument();
  });

  it('should invoke an enabled menu item action', async () => {
    const onClick = jest.fn();
    renderMenuItem({
      icon: <span>Icon</span>,
      useProps: () => ({ title: 'Test', onClick }),
    });

    await userEvent.click(await findMenuItem('Test'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should disable a menu item', async () => {
    const onClick = jest.fn();
    renderMenuItem({
      icon: <span>Icon</span>,
      useProps: () => ({ title: 'Test', onClick, disabled: true }),
    });

    const menuItem = await findMenuItem('Test');
    expect(menuItem).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(menuItem);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should allow useProps to use hooks', async () => {
    renderMenuItem({
      icon: <span>Icon</span>,
      useProps: () => {
        const [title, setTitle] = useState('Before');
        return { title, onClick: () => setTitle('After') };
      },
    });

    await userEvent.click(await findMenuItem('Before'));

    expect(await findMenuItem('After')).toBeInTheDocument();
  });

  it('should render a leading icon', async () => {
    renderMenuItem({
      icon: <span data-testid="icon">Icon</span>,
      useProps: () => ({ title: 'Test', onClick: () => {} }),
    });

    const menuItem = await findMenuItem('Test');
    expect(menuItem).toContainElement(screen.getByTestId('icon'));
  });

  it('should render external links with BUI link attributes', async () => {
    renderMenuItem({
      icon: <span>Icon</span>,
      useProps: () => ({ title: 'Test', href: 'https://example.com' }),
    });

    const menuItem = await findMenuItem('Test');
    expect(menuItem).toHaveAttribute('href', 'https://example.com');
    expect(menuItem).toHaveAttribute('target', '_blank');
    expect(menuItem).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should size MUI SVG icons for BUI menu items', async () => {
    renderMenuItem({
      icon: <svg className="MuiSvgIcon-root" data-testid="icon" />,
      useProps: () => ({ title: 'Test', onClick: () => {} }),
    });

    await findMenuItem('Test');

    expect(screen.getByTestId('icon')).toHaveStyle({
      fontSize: '1rem',
      width: '1rem',
      height: '1rem',
    });
  });

  it.each([
    { filter: { kind: 'Api' } },
    { filter: (e: Entity) => e.kind.toLowerCase() === 'api' },
  ])('should return a filter function, %#', async ({ filter }) => {
    const extension = EntityContextMenuItemBlueprint.make({
      name: 'test',
      params: {
        icon: <span>Icon</span>,
        useProps: () => ({ title: 'Test', onClick: () => {} }),
        filter,
      },
    });

    const tester = createExtensionTester(extension);

    const filterFn = tester.get(
      EntityContextMenuItemBlueprint.dataRefs.filterFunction,
    );

    expect(filterFn).toBeDefined();
    expect(filterFn?.({ kind: 'Api' } as Entity)).toBe(true);
    expect(filterFn?.({ kind: 'Component' } as Entity)).toBe(false);
  });
});
