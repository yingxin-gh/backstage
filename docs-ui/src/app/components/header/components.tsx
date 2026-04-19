'use client';

import { Header } from '../../../../../packages/ui/src/components/Header/Header';
import { Button } from '../../../../../packages/ui/src/components/Button/Button';
import { ButtonIcon } from '../../../../../packages/ui/src/components/ButtonIcon/ButtonIcon';
import {
  MenuTrigger,
  Menu,
  MenuItem,
} from '../../../../../packages/ui/src/components/Menu/Menu';
import { MemoryRouter } from 'react-router-dom';
import { RiMore2Line } from '@remixicon/react';

const tabs = [
  { id: 'overview', label: 'Overview', href: '/overview' },
  { id: 'checks', label: 'Checks', href: '/checks' },
  { id: 'tracks', label: 'Tracks', href: '/tracks' },
  { id: 'campaigns', label: 'Campaigns', href: '/campaigns' },
  { id: 'integrations', label: 'Integrations', href: '/integrations' },
];

const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Long Breadcrumb Name', href: '/long-breadcrumb' },
  { label: 'Another Long Breadcrumb', href: '/another-long-breadcrumb' },
  {
    label: 'Yet Another Long Breadcrumb',
    href: '/yet-another-long-breadcrumb',
  },
];

const tags = [
  { label: 'TypeScript' },
  { label: 'Platform', href: '/platform' },
  { label: 'Gold' },
];

const metadata = [
  { label: 'Owner', value: 'platform-team' },
  { label: 'Type', value: 'website' },
  { label: 'Tier', value: 'gold' },
];

export const WithEverything = () => (
  <MemoryRouter initialEntries={['/overview']}>
    <Header
      title="Page Title"
      tags={tags}
      description="A short description of this page. Supports [inline links](https://backstage.io) and **bold text**."
      metadata={metadata}
      tabs={tabs.slice(0, 2)}
      breadcrumbs={breadcrumbs.slice(0, 2)}
      customActions={
        <>
          <Button variant="secondary">Secondary</Button>
          <Button variant="primary">Primary</Button>
        </>
      }
    />
  </MemoryRouter>
);

export const WithTags = () => (
  <MemoryRouter>
    <Header title="Page Title" tags={tags} />
  </MemoryRouter>
);

export const WithDescription = () => (
  <MemoryRouter>
    <Header
      title="Page Title"
      description="A short description of this page. Supports [inline links](https://backstage.io) and **bold text**."
    />
  </MemoryRouter>
);

export const WithMetadata = () => (
  <MemoryRouter>
    <Header title="Page Title" metadata={metadata} />
  </MemoryRouter>
);

export const WithLongBreadcrumbs = () => (
  <MemoryRouter>
    <Header title="Page Title" breadcrumbs={breadcrumbs.slice(0, 2)} />
  </MemoryRouter>
);

export const WithTabs = () => (
  <MemoryRouter initialEntries={['/overview']}>
    <Header title="Page Title" tabs={tabs.slice(0, 3)} />
  </MemoryRouter>
);

export const WithCustomActions = () => (
  <MemoryRouter>
    <Header title="Page Title" customActions={<Button>Custom action</Button>} />
  </MemoryRouter>
);

export const WithMenu = () => (
  <MemoryRouter>
    <Header
      title="Page Title"
      customActions={
        <MenuTrigger>
          <ButtonIcon variant="tertiary" icon={<RiMore2Line />} />
          <Menu placement="bottom end">
            <MenuItem href="/settings">Settings</MenuItem>
            <MenuItem onAction={() => alert('logout')}>Logout</MenuItem>
          </Menu>
        </MenuTrigger>
      }
    />
  </MemoryRouter>
);
