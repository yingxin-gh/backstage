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

import { render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import {
  BreadcrumbsRegistryProvider,
  BreadcrumbEntry,
  useBreadcrumbEntries,
} from './useBreadcrumbs';

function BreadcrumbDisplay() {
  const { items: entries } = useBreadcrumbEntries();
  return (
    <ul data-testid="breadcrumbs">
      {entries.map((e, i) => (
        <li key={i}>
          {e.label}
          {e.href && ` (${e.href})`}
        </li>
      ))}
    </ul>
  );
}

describe('useBreadcrumbEntries', () => {
  it('should return empty items when no breadcrumbs are registered', () => {
    render(
      <BreadcrumbsRegistryProvider>
        <BreadcrumbDisplay />
      </BreadcrumbsRegistryProvider>,
    );

    expect(screen.getByTestId('breadcrumbs').children).toHaveLength(0);
  });

  it('should register a breadcrumb entry and display it', () => {
    render(
      <BreadcrumbsRegistryProvider>
        <BreadcrumbEntry entry={{ label: 'Home', href: '/home' }}>
          <BreadcrumbDisplay />
        </BreadcrumbEntry>
      </BreadcrumbsRegistryProvider>,
    );

    expect(screen.getByText('Home (/home)')).toBeInTheDocument();
  });

  it('should register multiple breadcrumbs in component tree order', () => {
    render(
      <BreadcrumbsRegistryProvider>
        <BreadcrumbEntry entry={{ label: 'Home', href: '/home' }}>
          <BreadcrumbEntry
            entry={{ label: 'Settings', href: '/home/settings' }}
          >
            <BreadcrumbDisplay />
          </BreadcrumbEntry>
        </BreadcrumbEntry>
      </BreadcrumbsRegistryProvider>,
    );

    const items = screen.getByTestId('breadcrumbs').querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Home (/home)');
    expect(items[1]).toHaveTextContent('Settings (/home/settings)');
  });

  it('should remove a breadcrumb when the component unmounts', () => {
    function Toggle() {
      const [showChild, setShowChild] = useState(true);
      return (
        <BreadcrumbEntry entry={{ label: 'Home', href: '/home' }}>
          {showChild && (
            <BreadcrumbEntry entry={{ label: 'Settings', href: '/settings' }}>
              <div />
            </BreadcrumbEntry>
          )}
          <BreadcrumbDisplay />
          <button onClick={() => setShowChild(false)}>remove</button>
        </BreadcrumbEntry>
      );
    }

    render(
      <BreadcrumbsRegistryProvider>
        <Toggle />
      </BreadcrumbsRegistryProvider>,
    );

    expect(
      screen.getByTestId('breadcrumbs').querySelectorAll('li'),
    ).toHaveLength(2);

    act(() => {
      screen.getByText('remove').click();
    });

    const items = screen.getByTestId('breadcrumbs').querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Home (/home)');
  });

  it('should register a breadcrumb entry', () => {
    render(
      <BreadcrumbsRegistryProvider>
        <BreadcrumbEntry entry={{ label: 'Current Page', href: '/current' }}>
          <BreadcrumbDisplay />
        </BreadcrumbEntry>
      </BreadcrumbsRegistryProvider>,
    );

    expect(screen.getByText('Current Page (/current)')).toBeInTheDocument();
  });

  it('should update a breadcrumb label in place without removing it', () => {
    function DynamicBreadcrumb() {
      const [label, setLabel] = useState('Draft');
      return (
        <BreadcrumbEntry entry={{ label, href: '/doc' }}>
          <BreadcrumbDisplay />
          <button onClick={() => setLabel('Published')}>publish</button>
        </BreadcrumbEntry>
      );
    }

    render(
      <BreadcrumbsRegistryProvider>
        <DynamicBreadcrumb />
      </BreadcrumbsRegistryProvider>,
    );

    expect(screen.getByText('Draft (/doc)')).toBeInTheDocument();

    act(() => {
      screen.getByText('publish').click();
    });

    const items = screen.getByTestId('breadcrumbs').querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Published (/doc)');
  });

  it('should return empty items outside of a provider', () => {
    render(<BreadcrumbDisplay />);

    expect(screen.getByTestId('breadcrumbs').children).toHaveLength(0);
  });
});
