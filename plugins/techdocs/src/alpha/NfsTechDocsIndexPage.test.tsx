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

import { ApiProvider } from '@backstage/core-app-api';
import { configApiRef, storageApiRef } from '@backstage/core-plugin-api';
import {
  MockStarredEntitiesApi,
  catalogApiRef,
  starredEntitiesApiRef,
} from '@backstage/plugin-catalog-react';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import {
  TestApiRegistry,
  mockApis,
  renderInTestApp,
} from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { rootDocsRouteRef } from '../routes';
import { NfsTechDocsIndexPage } from './NfsTechDocsIndexPage';

const mockCatalogApi = catalogApiMock({
  entities: [
    {
      apiVersion: 'version',
      kind: 'User',
      metadata: {
        name: 'owned',
        namespace: 'default',
      },
    },
  ],
});

describe('NfsTechDocsIndexPage', () => {
  it('renders the documentation heading and subtitle', async () => {
    const apiRegistry = TestApiRegistry.from(
      [catalogApiRef, mockCatalogApi],
      [
        configApiRef,
        mockApis.config({
          data: { organization: { name: 'My Company' } },
        }),
      ],
      [storageApiRef, mockApis.storage()],
      [starredEntitiesApiRef, new MockStarredEntitiesApi()],
    );

    await renderInTestApp(
      <ApiProvider apis={apiRegistry}>
        <NfsTechDocsIndexPage />
      </ApiProvider>,
      {
        mountedRoutes: {
          '/docs/:namespace/:kind/:name/*': rootDocsRouteRef,
        },
      },
    );

    expect(
      await screen.findByRole('heading', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Documentation available in My Company/i),
    ).toBeInTheDocument();
  });
});
