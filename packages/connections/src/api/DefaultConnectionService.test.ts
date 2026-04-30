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
import { JsonObject } from '@backstage/types';

const mockConfig = (override?: JsonObject) => {
  if (override) return mockServices.rootConfig({ data: override });

  return mockServices.rootConfig({
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
};

describe('DefaultConnectionsService', () => {
  let logger: ReturnType<typeof mockServices.logger.mock>;
  let service: DefaultConnectionsService;

  describe('forPlugin', () => {
    beforeEach(() => {
      logger = mockServices.logger.mock();
      service = DefaultConnectionsService.create({
        logger,
        config: mockConfig(),
      });
    });

    it('exposes unrestricted connections to every plugin', async () => {
      const catalog = service.forPlugin('catalog');

      const connection = await catalog.find({
        type: 'github',
        host: 'github.com',
      });

      expect(connection?.host).toBe('github.com');
      expect(connection?.auth.map(a => a.method)).toEqual(['token']);
    });

    it('hides connections that match a different plugin', async () => {
      const catalog = service.forPlugin('catalog');

      await expect(
        catalog.find({ type: 'github', host: 'enterprise.example.com' }),
      ).resolves.toBeUndefined();
    });

    it('exposes connections to the plugin named in their match rule', async () => {
      const scaffolder = service.forPlugin('scaffolder');

      const connection = await scaffolder.find({
        type: 'github',
        host: 'enterprise.example.com',
      });

      expect(connection?.host).toBe('enterprise.example.com');
      expect(connection?.auth.map(a => a.method)).toEqual(['app']);
    });

    it('narrows auth methods per plugin when auth has its own match rules', async () => {
      const catalog = service.forPlugin('catalog');
      const scaffolder = service.forPlugin('scaffolder');

      const splitForCatalog = await catalog.find({
        type: 'github',
        host: 'split.example.com',
      });
      const splitForScaffolder = await scaffolder.find({
        type: 'github',
        host: 'split.example.com',
      });

      expect(splitForCatalog?.auth.map(a => a.method)).toEqual(['token']);
      expect(splitForScaffolder?.auth.map(a => a.method)).toEqual(['app']);
    });

    it('keeps all auth methods visible when none have match rules', async () => {
      const catalog = service.forPlugin('catalog');
      const scaffolder = service.forPlugin('scaffolder');

      const sharedForCatalog = await catalog.find({
        type: 'github',
        host: 'shared.example.com',
      });
      const sharedForScaffolder = await scaffolder.find({
        type: 'github',
        host: 'shared.example.com',
      });

      expect(sharedForCatalog?.auth.map(a => a.method).sort()).toEqual([
        'app',
        'token',
      ]);
      expect(sharedForScaffolder?.auth.map(a => a.method).sort()).toEqual([
        'app',
        'token',
      ]);
    });

    it('returns undefined for hosts that are not configured', async () => {
      const catalog = service.forPlugin('catalog');

      await expect(
        catalog.find({ type: 'github', host: 'missing.example.com' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('legacy integrations', () => {
    beforeEach(() => {
      logger = mockServices.logger.mock();
    });

    it('exposes a github integration as a connection via forPlugin', async () => {
      const config = mockConfig({
        integrations: {
          github: [
            {
              host: 'enterprise.example.com',
              apiBaseUrl: 'https://enterprise.example.com/api/v3',
              token: 'enterprise-token',
              apps: [
                {
                  appId: 7,
                  privateKey: 'pk',
                  clientId: 'client',
                  clientSecret: 'secret',
                },
              ],
            },
          ],
        },
      });

      service = DefaultConnectionsService.create({ logger, config });
      const connection = await service.forPlugin('catalog').find({
        type: 'github',
        host: 'enterprise.example.com',
      });

      expect(connection?.host).toBe('enterprise.example.com');
      expect(connection?.apiBaseUrl).toBe(
        'https://enterprise.example.com/api/v3',
      );
      expect(connection?.auth.map(a => a.method).sort()).toEqual([
        'app',
        'token',
      ]);
    });

    it('merges legacy integrations with explicit connections config', async () => {
      const config = mockConfig({
        integrations: {
          github: [{ host: 'github.com', token: 'legacy-token' }],
        },
        connections: [
          {
            type: 'github',
            host: 'enterprise.example.com',
            auth: [{ method: 'token', token: 'connections-token' }],
          },
        ],
      });

      service = DefaultConnectionsService.create({ logger, config });
      const catalog = service.forPlugin('catalog');

      await expect(
        catalog.find({ type: 'github', host: 'github.com' }),
      ).resolves.toMatchObject({
        host: 'github.com',
        auth: [{ method: 'token', token: 'legacy-token' }],
      });

      await expect(
        catalog.find({ type: 'github', host: 'enterprise.example.com' }),
      ).resolves.toMatchObject({
        host: 'enterprise.example.com',
        auth: [{ method: 'token', token: 'connections-token' }],
      });
    });
  });

  describe('config validation', () => {
    beforeEach(() => {
      logger = mockServices.logger.mock();
    });

    it('logs the failing field when a connection is missing a required value', () => {
      const config = mockConfig({
        connections: [
          {
            type: 'github',
            host: 'github.com',
            // Token auth is missing the required `token` field.
            auth: [{ method: 'token' }],
          },
        ],
      });

      DefaultConnectionsService.create({ logger, config });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('connection of type "github"'),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid input: expected string'),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('at auth[0].token'),
      );
    });

    it('logs the offending field when a connection has an unknown property', () => {
      const config = mockConfig({
        connections: [
          {
            type: 'github',
            host: 'github.com',
            host2: 'github.com',
            auth: [{ method: 'token', token: 'abc' }],
          },
        ],
      });

      DefaultConnectionsService.create({ logger, config });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('connection of type "github"'),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognized key: "host2"'),
      );
    });
  });
});
