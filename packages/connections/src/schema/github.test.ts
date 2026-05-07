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
import { DefaultConnectionsService } from '../api';

describe('matchAuth', () => {
  it('picks the app whose allowedOwners contains the URL org', async () => {
    const service = DefaultConnectionsService.create({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig({
        data: {
          connections: [
            {
              type: 'github',
              host: 'matchauth.example.com',
              auth: [
                {
                  method: 'app',
                  appId: 1,
                  privateKey: 'pk-acme',
                  clientId: 'client-acme',
                  clientSecret: 'secret-acme',
                  allowedOwners: ['acme'],
                },
                {
                  method: 'app',
                  appId: 2,
                  privateKey: 'pk-widgets',
                  clientId: 'client-widgets',
                  clientSecret: 'secret-widgets',
                  allowedOwners: ['widgets'],
                },
              ],
            },
          ],
        },
      }),
    });
    const catalog = service.forPlugin('catalog');

    const acme = await catalog.find({
      type: 'github',
      url: 'https://matchauth.example.com/acme/repo',
      authMethods: ['app'],
    });
    const widgets = await catalog.find({
      type: 'github',
      url: 'https://matchauth.example.com/widgets/other-repo',
      authMethods: ['app'],
    });

    expect((acme?.auth as { appId: number }).appId).toBe(1);
    expect((widgets?.auth as { appId: number }).appId).toBe(2);
  });

  it('falls back to the unrestricted app when no allowedOwners matches', async () => {
    const service = DefaultConnectionsService.create({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig({
        data: {
          connections: [
            {
              type: 'github',
              host: 'matchauth.example.com',
              auth: [
                {
                  method: 'app',
                  appId: 2,
                  privateKey: 'pk-widgets',
                  clientId: 'client-widgets',
                  clientSecret: 'secret-widgets',
                  allowedOwners: ['widgets'],
                },
                {
                  method: 'app',
                  appId: 3,
                  privateKey: 'pk-fallback',
                  clientId: 'client-fallback',
                  clientSecret: 'secret-fallback',
                },
              ],
            },
          ],
        },
      }),
    });

    const connection = await service.forPlugin('catalog').find({
      type: 'github',
      url: 'https://matchauth.example.com/unknown-org/repo',
      authMethods: ['app'],
    });

    expect((connection?.auth as { appId: number }).appId).toBe(3);
  });

  it('throws when matchAuth picks an app but the caller only declared token', async () => {
    const service = DefaultConnectionsService.create({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig({
        data: {
          connections: [
            {
              type: 'github',
              host: 'matchauth.example.com',
              auth: [
                {
                  method: 'app',
                  appId: 2,
                  privateKey: 'pk-widgets',
                  clientId: 'client-widgets',
                  clientSecret: 'secret-widgets',
                  allowedOwners: ['widgets'],
                },
                {
                  method: 'token',
                  token: 'abc',
                },
              ],
            },
          ],
        },
      }),
    });

    // matchAuth picks the org-matched app for /acme/...; caller declared
    // only ['token'], so this is a capability mismatch and must throw.
    await expect(
      service.forPlugin('catalog').find({
        type: 'github',
        url: 'https://matchauth.example.com/acme/repo',
        authMethods: ['token'],
      }),
    ).rejects.toThrow(
      /Connection not found for type "github" with auth method "app"/,
    );
  });
});
