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

import { renderInTestApp } from '@backstage/frontend-test-utils';
import { MenuItem } from '@backstage/ui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityContextMenu } from './EntityContextMenu';

describe('EntityContextMenu', () => {
  it('renders the trigger and supplied menu items', async () => {
    await renderInTestApp(
      <EntityContextMenu
        contextMenuItems={[<MenuItem key="supplied">Supplied item</MenuItem>]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Supplied item' }),
    ).toBeInTheDocument();
  });

  it('renders extras first with an icon and separator, and handles actions', async () => {
    const onClick = jest.fn();
    const Icon = () => <span data-testid="extra-icon" />;

    await renderInTestApp(
      <EntityContextMenu
        UNSTABLE_extraContextMenuItems={[
          { title: 'Extra item', Icon, onClick },
        ]}
        contextMenuItems={[<MenuItem key="supplied">Supplied item</MenuItem>]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent('Extra item');
    expect(screen.getByTestId('extra-icon')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Extra item' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a separator without extras', async () => {
    await renderInTestApp(
      <EntityContextMenu
        contextMenuItems={[<MenuItem key="supplied">Supplied item</MenuItem>]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('does not render a separator without supplied items', async () => {
    await renderInTestApp(
      <EntityContextMenu
        UNSTABLE_extraContextMenuItems={[
          { title: 'Extra item', Icon: () => null, onClick: () => {} },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('closes immediately when a supplied async action remains pending', async () => {
    const pendingAction = new Promise<void>(() => {});

    await renderInTestApp(
      <EntityContextMenu
        contextMenuItems={[
          <MenuItem key="pending" onAction={() => pendingAction}>
            Pending action
          </MenuItem>,
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Pending action' }),
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
