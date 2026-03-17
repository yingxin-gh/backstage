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

import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { ScaffolderPageLayout } from './ScaffolderPageLayout';

describe('ScaffolderPageLayout', () => {
  it('preserves BUI titles, subtitles, and breadcrumb links', async () => {
    await renderInTestApp(
      <ScaffolderPageLayout
        headerVariant="bui"
        pageTitleOverride="Task page"
        title={
          <div>
            Task <code>My template</code>
          </div>
        }
        subtitle="Task ID: 123"
        type="Scaffolder"
        typeLink="/create"
      >
        <div>Body content</div>
      </ScaffolderPageLayout>,
    );

    expect(
      screen.getByRole('heading', { name: 'Task page' }),
    ).toBeInTheDocument();
    expect(screen.getByText('My template')).toBeInTheDocument();
    expect(screen.getByText('Task ID: 123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scaffolder' })).toHaveAttribute(
      'href',
      '/create',
    );
  });
});
