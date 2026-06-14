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

import { screen, waitFor } from '@testing-library/react';
import { Route, Routes, useParams } from 'react-router-dom';
import {
  renderTestApp,
  createExtensionTester,
  renderInTestApp,
} from '@backstage/frontend-test-utils';
import {
  PageBlueprint,
  coreExtensionData,
  createExtension,
} from '@backstage/frontend-plugin-api';
import { BreadcrumbRegistration } from '@backstage/ui';

describe('PageLayout', () => {
  it('should register a breadcrumb for the plugin root page', async () => {
    const catalogPage = PageBlueprint.make({
      name: 'catalog',
      params: {
        title: 'Catalog',
        path: '/catalog',
        loader: async () => <div>Catalog content</div>,
      },
    });

    renderTestApp({
      extensions: [catalogPage],
      initialRouteEntries: ['/catalog'],
    });

    await waitFor(() => {
      expect(screen.getByText('Catalog')).toBeInTheDocument();
    });

    const breadcrumbList = screen.getByRole('list', { name: 'Breadcrumbs' });
    expect(breadcrumbList).toHaveTextContent('Catalog');
  });

  it('should render the PluginHeader with the page title', async () => {
    const myPage = PageBlueprint.make({
      name: 'my-plugin',
      params: {
        title: 'My Plugin',
        path: '/my-plugin',
        loader: async () => <div>Plugin content</div>,
      },
    });

    renderTestApp({
      extensions: [myPage],
      initialRouteEntries: ['/my-plugin'],
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'My Plugin' }),
      ).toBeInTheDocument();
    });
  });

  it('should not render a header when noHeader is true', async () => {
    const noHeaderPage = PageBlueprint.make({
      name: 'headless',
      params: {
        title: 'Headless',
        path: '/headless',
        noHeader: true,
        loader: async () => <div data-testid="headless-content">Content</div>,
      },
    });

    renderTestApp({
      extensions: [noHeaderPage],
      initialRouteEntries: ['/headless'],
    });

    await waitFor(() => {
      expect(screen.getByTestId('headless-content')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('list', { name: 'Breadcrumbs' }),
    ).not.toBeInTheDocument();
  });

  it('should register breadcrumbs for sub-pages', async () => {
    const myPage = PageBlueprint.make({
      name: 'my-plugin',
      params: {
        title: 'My Plugin',
        path: '/my-plugin',
      },
    });

    const overviewSubPage = createExtension({
      kind: 'sub-page',
      name: 'overview',
      attachTo: { id: 'page:my-plugin', input: 'pages' },
      output: [
        coreExtensionData.routePath,
        coreExtensionData.reactElement,
        coreExtensionData.title,
      ],
      factory() {
        return [
          coreExtensionData.routePath('overview'),
          coreExtensionData.reactElement(<div>Overview content</div>),
          coreExtensionData.title('Overview'),
        ];
      },
    });

    const tester = createExtensionTester(myPage).add(overviewSubPage);

    renderInTestApp(tester.reactElement(), {
      initialRouteEntries: ['/overview'],
    });

    await waitFor(() => {
      expect(screen.getByText('Overview content')).toBeInTheDocument();
    });

    const breadcrumbList = screen.getByRole('list', { name: 'Breadcrumbs' });
    expect(breadcrumbList).toHaveTextContent('My Plugin');
    expect(breadcrumbList).toHaveTextContent('Overview');
  });

  it('should register breadcrumbs for inner routes within a sub-page', async () => {
    function TaskDetail() {
      const { taskId } = useParams<{ taskId: string }>();
      return (
        <BreadcrumbRegistration
          entry={{ label: taskId ?? 'Task', href: taskId ?? '' }}
        >
          <div>Task detail: {taskId}</div>
        </BreadcrumbRegistration>
      );
    }

    function TasksSubPage() {
      return (
        <Routes>
          <Route index element={<div>Tasks list</div>} />
          <Route path=":taskId" element={<TaskDetail />} />
        </Routes>
      );
    }

    const myPage = PageBlueprint.make({
      name: 'scaffolder',
      params: {
        title: 'Create',
        path: '/create',
      },
    });

    const tasksSubPage = createExtension({
      kind: 'sub-page',
      name: 'tasks',
      attachTo: { id: 'page:scaffolder', input: 'pages' },
      output: [
        coreExtensionData.routePath,
        coreExtensionData.reactElement,
        coreExtensionData.title,
      ],
      factory() {
        return [
          coreExtensionData.routePath('tasks'),
          coreExtensionData.reactElement(<TasksSubPage />),
          coreExtensionData.title('Tasks'),
        ];
      },
    });

    const tester = createExtensionTester(myPage).add(tasksSubPage);

    renderInTestApp(tester.reactElement(), {
      initialRouteEntries: ['/tasks/abc-123'],
    });

    await waitFor(() => {
      expect(screen.getByText('Task detail: abc-123')).toBeInTheDocument();
    });

    const breadcrumbList = screen.getByRole('list', { name: 'Breadcrumbs' });
    expect(breadcrumbList).toHaveTextContent('Create');
    expect(breadcrumbList).toHaveTextContent('Tasks');
    expect(breadcrumbList).toHaveTextContent('abc-123');
  });
});
