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

import {
  PageBlueprint,
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { within } from '@testing-library/react';
import { createDevApp } from './createDevApp';

const anyEnv = (process.env = { ...process.env }) as any;

describe('createDevApp', () => {
  afterEach(() => {
    delete anyEnv.APP_CONFIG;
    document.getElementById('root')?.remove();
  });

  it('should render a dev app with a plugin', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    const testPlugin = createFrontendPlugin({
      pluginId: 'test',
      extensions: [
        PageBlueprint.make({
          params: {
            path: '/',
            loader: async () => <div>Test Plugin Page</div>,
          },
        }),
      ],
    });

    anyEnv.APP_CONFIG = [
      {
        context: 'test',
        data: {
          app: { title: 'Test App' },
          backend: { baseUrl: 'http://localhost' },
        },
      },
    ];

    createDevApp({
      features: [testPlugin],
    });

    const body = within(document.body);
    await body.findByText('Test Plugin Page', {}, { timeout: 10000 });
  }, 15000);
});
