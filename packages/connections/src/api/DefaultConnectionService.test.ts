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
import { mockServices } from '@backstage/backend-test-utils';
import { DefaultConnectionsService } from './DefaultConnectionService';

describe('DefaultConnectionsService', () => {
  describe('forPlugin', () => {
    it('filters connections and auth methods based on plugin match rules', async () => {
      const logger = mockServices.logger.mock();
      const config = mockServices.rootConfig({
        data: {
          connections: [
            // Open to every plugin, single token auth.
            {
              type: 'github',
              host: 'github.com',
              auth: [{ method: 'token', token: 'public-token' }],
            },
            // Connection itself is restricted to the scaffolder plugin.
            {
              type: 'github',
              host: 'enterprise.example.com',
              match: { plugins: ['scaffolder'] },
              auth: [
                {
                  method: 'app',
                  appId: 1,
                  privateKey: 'pk-enterprise',
                  clientId: 'client-enterprise',
                  clientSecret: 'secret-enterprise',
                },
              ],
            },
            // Open connection, but each auth method is restricted to a
            // different plugin.
            {
              type: 'github',
              host: 'split.example.com',
              auth: [
                {
                  method: 'token',
                  token: 'split-token',
                  match: { plugins: ['catalog'] },
                },
                {
                  method: 'app',
                  appId: 2,
                  privateKey: 'pk-split',
                  clientId: 'client-split',
                  clientSecret: 'secret-split',
                  match: { plugins: ['scaffolder'] },
                },
              ],
            },
            // Open connection with both auth methods unrestricted.
            {
              type: 'github',
              host: 'shared.example.com',
              auth: [
                { method: 'token', token: 'shared-token' },
                {
                  method: 'app',
                  appId: 3,
                  privateKey: 'pk-shared',
                  clientId: 'client-shared',
                  clientSecret: 'secret-shared',
                },
              ],
            },
          ],
        },
      });

      const service = DefaultConnectionsService.create({ logger, config });
      const catalog = service.forPlugin('catalog');
      const scaffolder = service.forPlugin('scaffolder');

      // Connections without a match are visible to every plugin and keep all
      // unrestricted auth methods.
      const githubForCatalog = await catalog.find({
        type: 'github',
        host: 'github.com',
      });
      expect(githubForCatalog?.config.host).toBe('github.com');
      expect(githubForCatalog?.auth.map(a => a.method)).toEqual(['token']);

      // Connections with a plugin match are hidden from other plugins.
      await expect(
        catalog.find({ type: 'github', host: 'enterprise.example.com' }),
      ).resolves.toBeUndefined();
      const enterpriseForScaffolder = await scaffolder.find({
        type: 'github',
        host: 'enterprise.example.com',
      });
      expect(enterpriseForScaffolder?.config.host).toBe(
        'enterprise.example.com',
      );
      expect(enterpriseForScaffolder?.auth.map(a => a.method)).toEqual(['app']);

      // Auth-method matches narrow the visible auth methods per plugin while
      // the connection itself stays visible.
      const splitForCatalog = await catalog.find({
        type: 'github',
        host: 'split.example.com',
      });
      expect(splitForCatalog?.auth.map(a => a.method)).toEqual(['token']);
      const splitForScaffolder = await scaffolder.find({
        type: 'github',
        host: 'split.example.com',
      });
      expect(splitForScaffolder?.auth.map(a => a.method)).toEqual(['app']);

      // Connections with no matches at any level remain fully visible.
      const sharedForCatalog = await catalog.find({
        type: 'github',
        host: 'shared.example.com',
      });
      expect(sharedForCatalog?.auth.map(a => a.method).sort()).toEqual([
        'app',
        'token',
      ]);
      const sharedForScaffolder = await scaffolder.find({
        type: 'github',
        host: 'shared.example.com',
      });
      expect(sharedForScaffolder?.auth.map(a => a.method).sort()).toEqual([
        'app',
        'token',
      ]);

      // Looking up a host that does not exist returns undefined regardless of
      // plugin.
      await expect(
        catalog.find({ type: 'github', host: 'missing.example.com' }),
      ).resolves.toBeUndefined();
    });
  });
});
