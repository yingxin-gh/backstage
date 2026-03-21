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

import preview from '../../../../.storybook/preview';
import type { StoryFn } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { BUIProvider } from '../provider';
import {
  PluginHeader,
  Header,
  Button,
  ButtonIcon,
  Card,
  Container,
  Flex,
  MenuTrigger,
  Menu,
  MenuItem,
} from '..';
import {
  RiBookOpenLine,
  RiBox3Line,
  RiCodeSSlashLine,
  RiDownloadLine,
  RiEdit2Line,
  RiGitBranchLine,
  RiMore2Line,
  RiPlayLine,
  RiRefreshLine,
  RiSettings4Line,
  RiShieldCheckLine,
  RiShareBoxLine,
  RiTerminalLine,
} from '@remixicon/react';

// ---------------------------------------------------------------------------
// Shared page content placeholder
// ---------------------------------------------------------------------------

const PageContent = () => (
  <Container mt="6">
    <Flex direction="row" gap="4">
      <Card style={{ minHeight: 120, flex: 1 }} />
      <Card style={{ minHeight: 120, flex: 1 }} />
      <Card style={{ minHeight: 120, flex: 1 }} />
    </Flex>
  </Container>
);

// ---------------------------------------------------------------------------
// Shared layout decorator
// ---------------------------------------------------------------------------

const withLayout = (Story: StoryFn) => (
  <MemoryRouter>
    <BUIProvider>
      <Story />
    </BUIProvider>
  </MemoryRouter>
);

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = preview.meta({
  title: 'Recipes/PluginHeader and Header',
  parameters: {
    layout: 'fullscreen',
  },
});

// ---------------------------------------------------------------------------
// Story: Catalog entity page
// ---------------------------------------------------------------------------

export const CatalogEntityPage = meta.story({
  decorators: [withLayout],
  render: () => (
    <>
      <PluginHeader
        icon={<RiBox3Line />}
        title="Catalog"
        titleLink="/"
        tabs={[
          { id: 'catalog', label: 'Catalog', href: '/catalog' },
          { id: 'apis', label: 'APIs', href: '/apis' },
          { id: 'resources', label: 'Resources', href: '/resources' },
          { id: 'templates', label: 'Templates', href: '/templates' },
          { id: 'docs', label: 'Docs', href: '/docs' },
        ]}
        customActions={
          <>
            <ButtonIcon
              variant="secondary"
              icon={<RiSettings4Line />}
              aria-label="Settings"
            />
            <MenuTrigger>
              <ButtonIcon
                variant="secondary"
                icon={<RiMore2Line />}
                aria-label="More options"
              />
              <Menu placement="bottom end">
                <MenuItem href="/catalog/import">Import component</MenuItem>
                <MenuItem href="/catalog/register">Register existing</MenuItem>
                <MenuItem href="/catalog/docs">View documentation</MenuItem>
              </Menu>
            </MenuTrigger>
          </>
        }
      />
      <Header
        title="payment-service"
        breadcrumbs={[
          { label: 'Catalog', href: '/catalog' },
          { label: 'Services', href: '/catalog?kind=Component' },
        ]}
        tabs={[
          { id: 'overview', label: 'Overview', href: '/overview' },
          { id: 'ci-cd', label: 'CI/CD', href: '/ci-cd' },
          { id: 'api', label: 'API', href: '/api' },
          { id: 'dependencies', label: 'Dependencies', href: '/dependencies' },
          { id: 'docs', label: 'Docs', href: '/docs' },
        ]}
        customActions={
          <>
            <Button variant="secondary" iconStart={<RiEdit2Line />}>
              Edit
            </Button>
            <Button variant="primary" iconStart={<RiShareBoxLine />}>
              Unregister
            </Button>
          </>
        }
      />
      <PageContent />
    </>
  ),
});

// ---------------------------------------------------------------------------
// Story: CI/CD pipeline view
// ---------------------------------------------------------------------------

export const CICDPipelineView = meta.story({
  decorators: [withLayout],
  render: () => (
    <>
      <PluginHeader
        icon={<RiGitBranchLine />}
        title="CI/CD"
        titleLink="/"
        tabs={[
          { id: 'builds', label: 'Builds', href: '/builds' },
          { id: 'pipelines', label: 'Pipelines', href: '/pipelines' },
          { id: 'deployments', label: 'Deployments', href: '/deployments' },
          { id: 'settings', label: 'Settings', href: '/settings' },
        ]}
        customActions={
          <>
            <ButtonIcon
              variant="tertiary"
              icon={<RiRefreshLine />}
              aria-label="Refresh"
            />
          </>
        }
      />
      <Header
        title="main · #842"
        tabs={[
          { id: 'summary', label: 'Summary', href: '/summary' },
          { id: 'steps', label: 'Steps', href: '/steps' },
          { id: 'artifacts', label: 'Artifacts', href: '/artifacts' },
          { id: 'logs', label: 'Logs', href: '/logs' },
        ]}
        customActions={
          <>
            <Button variant="secondary" iconStart={<RiDownloadLine />}>
              Download logs
            </Button>
            <Button variant="primary" iconStart={<RiPlayLine />}>
              Re-run pipeline
            </Button>
          </>
        }
      />
      <PageContent />
    </>
  ),
});

// ---------------------------------------------------------------------------
// Story: TechDocs page
// ---------------------------------------------------------------------------

export const TechDocsPage = meta.story({
  decorators: [withLayout],
  render: () => (
    <>
      <PluginHeader
        icon={<RiBookOpenLine />}
        title="TechDocs"
        titleLink="/"
        tabs={[
          { id: 'explore', label: 'Explore', href: '/explore' },
          { id: 'owned', label: 'Owned by me', href: '/owned' },
          { id: 'starred', label: 'Starred', href: '/starred' },
        ]}
      />
      <Header
        title="Getting started"
        tabs={[
          { id: 'overview', label: 'Overview', href: '/overview' },
          {
            id: 'architecture',
            label: 'Architecture',
            href: '/architecture',
          },
          { id: 'runbooks', label: 'Runbooks', href: '/runbooks' },
          { id: 'adr', label: 'ADRs', href: '/adr' },
        ]}
        customActions={
          <MenuTrigger>
            <ButtonIcon
              variant="tertiary"
              icon={<RiMore2Line />}
              aria-label="More options"
            />
            <Menu placement="bottom end">
              <MenuItem iconStart={<RiShareBoxLine />} href="/share">
                Share link
              </MenuItem>
              <MenuItem iconStart={<RiEdit2Line />} href="/edit">
                Edit on GitHub
              </MenuItem>
            </Menu>
          </MenuTrigger>
        }
      />
      <PageContent />
    </>
  ),
});

// ---------------------------------------------------------------------------
// Story: Security / compliance audit page
// ---------------------------------------------------------------------------

export const SecurityAuditPage = meta.story({
  decorators: [withLayout],
  render: () => (
    <>
      <PluginHeader
        icon={<RiShieldCheckLine />}
        title="Security"
        titleLink="/"
        tabs={[
          { id: 'overview', label: 'Overview', href: '/overview' },
          { id: 'vulnerabilities', label: 'Vulnerabilities', href: '/vulns' },
          { id: 'policies', label: 'Policies', href: '/policies' },
          { id: 'audits', label: 'Audits', href: '/audits' },
        ]}
        customActions={
          <>
            <ButtonIcon
              variant="tertiary"
              icon={<RiRefreshLine />}
              aria-label="Refresh scan"
            />
            <Button variant="primary" iconStart={<RiTerminalLine />}>
              Run scan
            </Button>
          </>
        }
      />
      <Header
        title="payment-service"
        tabs={[
          { id: 'critical', label: 'Critical', href: '/critical' },
          { id: 'high', label: 'High', href: '/high' },
          { id: 'medium', label: 'Medium', href: '/medium' },
          { id: 'low', label: 'Low', href: '/low' },
        ]}
        customActions={
          <>
            <Button variant="secondary" iconStart={<RiDownloadLine />}>
              Export report
            </Button>
          </>
        }
      />
      <PageContent />
    </>
  ),
});

// ---------------------------------------------------------------------------
// Story: Minimal — no tabs, no actions
// ---------------------------------------------------------------------------

export const Minimal = meta.story({
  decorators: [withLayout],
  render: () => (
    <>
      <PluginHeader icon={<RiCodeSSlashLine />} title="APIs" titleLink="/" />
      <Header title="payments-api" />
      <PageContent />
    </>
  ),
});
