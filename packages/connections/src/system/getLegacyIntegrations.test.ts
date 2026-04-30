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
import { getLegacyIntegrations } from './getLegacyIntegrations';
import { AzureConnectionType } from '../schema/azure';
import { BitbucketCloudConnectionType } from '../schema/bitbucketCloud';
import { BitbucketServerConnectionType } from '../schema/bitbucketServer';
import { GerritConnectionType } from '../schema/gerrit';
import { GiteaConnectionType } from '../schema/gitea';
import { GithubConnectionType } from '../schema/github';
import { GitlabConnectionType } from '../schema/gitlab';
import { HarnessConnectionType } from '../schema/harness';

describe('getLegacyIntegrations', () => {
  it('returns an empty list when no integrations are configured', () => {
    const config = mockServices.rootConfig({ data: {} });
    expect(getLegacyIntegrations(config)).toEqual([]);
  });

  describe('github', () => {
    it('converts a token-only integration to a connection with a single token auth method', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [
              {
                host: 'github.com',
                token: 'gh-token',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'github',
          host: 'github.com',
          auth: [{ method: 'token', token: 'gh-token' }],
        },
      ]);
    });

    it('converts apiBaseUrl and rawBaseUrl when present', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [
              {
                host: 'enterprise.example.com',
                apiBaseUrl: 'https://enterprise.example.com/api/v3',
                rawBaseUrl: 'https://enterprise.example.com/raw',
                token: 'enterprise-token',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'github',
          host: 'enterprise.example.com',
          apiBaseUrl: 'https://enterprise.example.com/api/v3',
          rawBaseUrl: 'https://enterprise.example.com/raw',
          auth: [{ method: 'token', token: 'enterprise-token' }],
        },
      ]);
    });

    it('merges a top-level token and multiple apps into a single connection', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [
              {
                host: 'github.com',
                token: 'gh-token',
                apps: [
                  {
                    appId: 1,
                    privateKey: 'pk-1',
                    clientId: 'client-1',
                    clientSecret: 'secret-1',
                  },
                  {
                    appId: 2,
                    privateKey: 'pk-2',
                    clientId: 'client-2',
                    clientSecret: 'secret-2',
                    webhookSecret: 'whsec',
                    allowedInstallationOwners: ['acme', 'widgets'],
                    publicAccess: true,
                  },
                ],
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'github',
          host: 'github.com',
          auth: [
            { method: 'token', token: 'gh-token' },
            {
              method: 'app',
              appId: 1,
              privateKey: 'pk-1',
              clientId: 'client-1',
              clientSecret: 'secret-1',
            },
            {
              method: 'app',
              appId: 2,
              privateKey: 'pk-2',
              clientId: 'client-2',
              clientSecret: 'secret-2',
              webhookSecret: 'whsec',
              allowedOwners: ['acme', 'widgets'],
              publicAccess: true,
            },
          ],
        },
      ]);
    });

    it('emits one connection per legacy entry, preserving order', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [
              { host: 'github.com', token: 'public' },
              { host: 'enterprise.example.com', token: 'enterprise' },
            ],
          },
        },
      });

      const result = getLegacyIntegrations(config);
      expect(result.map(c => (c as { host: string }).host)).toEqual([
        'github.com',
        'enterprise.example.com',
      ]);
    });

    it('emits a connection with an empty auth array when neither token nor apps are configured', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [{ host: 'github.com' }],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        { type: 'github', host: 'github.com', auth: [] },
      ]);
    });

    it('produces output that validates against the github connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            github: [
              {
                host: 'github.com',
                token: 'gh-token',
                apps: [
                  {
                    appId: 1,
                    privateKey: 'pk',
                    clientId: 'client',
                    clientSecret: 'secret',
                    allowedInstallationOwners: ['acme'],
                    publicAccess: true,
                  },
                ],
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => GithubConnectionType.schema.parse(converted)).not.toThrow();
    });
  });

  describe('gitlab', () => {
    it('converts a token-only integration to a connection with a single token auth method', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitlab: [
              {
                host: 'gitlab.com',
                token: 'gl-token',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'gitlab',
          host: 'gitlab.com',
          auth: [{ method: 'token', token: 'gl-token' }],
        },
      ]);
    });

    it('carries apiBaseUrl and baseUrl through when present', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitlab: [
              {
                host: 'gitlab.example.com',
                apiBaseUrl: 'https://gitlab.example.com/api/v4',
                baseUrl: 'https://gitlab.example.com',
                token: 'self-hosted-token',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'gitlab',
          host: 'gitlab.example.com',
          apiBaseUrl: 'https://gitlab.example.com/api/v4',
          baseUrl: 'https://gitlab.example.com',
          auth: [{ method: 'token', token: 'self-hosted-token' }],
        },
      ]);
    });

    it('drops commitSigningKey and retry config during conversion', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitlab: [
              {
                host: 'gitlab.com',
                token: 'gl-token',
                commitSigningKey: 'pgp-key',
                retry: {
                  maxRetries: 3,
                  retryStatusCodes: [429, 503],
                  maxApiRequestsPerMinute: 60,
                },
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'gitlab',
          host: 'gitlab.com',
          auth: [{ method: 'token', token: 'gl-token' }],
        },
      ]);
    });

    it('emits a connection with an empty auth array when no token is configured', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitlab: [{ host: 'gitlab.com' }],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        { type: 'gitlab', host: 'gitlab.com', auth: [] },
      ]);
    });

    it('produces output that validates against the gitlab connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitlab: [
              {
                host: 'gitlab.example.com',
                apiBaseUrl: 'https://gitlab.example.com/api/v4',
                baseUrl: 'https://gitlab.example.com',
                token: 'gl-token',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => GitlabConnectionType.schema.parse(converted)).not.toThrow();
    });
  });

  describe('bitbucket-cloud', () => {
    it('hardcodes the host to bitbucket.org and emits one auth method per credential pair', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketCloud: [
              {
                username: 'user',
                token: 'tok',
                appPassword: 'pwd',
                clientId: 'cid',
                clientSecret: 'csecret',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'bitbucket-cloud',
          host: 'bitbucket.org',
          auth: [
            { method: 'token', username: 'user', token: 'tok' },
            { method: 'appPassword', username: 'user', appPassword: 'pwd' },
            { method: 'oauth', clientId: 'cid', clientSecret: 'csecret' },
          ],
        },
      ]);
    });

    it('skips token/appPassword auth when username is missing', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketCloud: [
              {
                token: 'tok',
                appPassword: 'pwd',
                clientId: 'cid',
                clientSecret: 'csecret',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(
        (converted as { auth: { method: string }[] }).auth.map(a => a.method),
      ).toEqual(['oauth']);
    });

    it('produces output that validates against the bitbucket-cloud connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketCloud: [
              {
                username: 'user',
                token: 'tok',
                clientId: 'cid',
                clientSecret: 'csecret',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() =>
        BitbucketCloudConnectionType.schema.parse(converted),
      ).not.toThrow();
    });
  });

  describe('bitbucket-server', () => {
    it('emits separate token and basic auth methods', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketServer: [
              {
                host: 'bitbucket.example.com',
                apiBaseUrl: 'https://bitbucket.example.com/rest/api/1.0',
                token: 'tok',
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'bitbucket-server',
          host: 'bitbucket.example.com',
          apiBaseUrl: 'https://bitbucket.example.com/rest/api/1.0',
          auth: [
            { method: 'token', token: 'tok' },
            { method: 'basic', username: 'user', password: 'pwd' },
          ],
        },
      ]);
    });

    it('drops commitSigningKey during conversion', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketServer: [
              {
                host: 'bitbucket.example.com',
                token: 'tok',
                commitSigningKey: 'pgp',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'bitbucket-server',
          host: 'bitbucket.example.com',
          auth: [{ method: 'token', token: 'tok' }],
        },
      ]);
    });

    it('produces output that validates against the bitbucket-server connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            bitbucketServer: [
              {
                host: 'bitbucket.example.com',
                apiBaseUrl: 'https://bitbucket.example.com/rest/api/1.0',
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() =>
        BitbucketServerConnectionType.schema.parse(converted),
      ).not.toThrow();
    });
  });

  describe('azure', () => {
    it('emits one auth method per credentials[] entry, picking the type by which fields are set', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            azure: [
              {
                host: 'dev.azure.com',
                credentials: [
                  {
                    organizations: ['acme'],
                    personalAccessToken: 'pat-token',
                  },
                  {
                    clientId: 'cid',
                    clientSecret: 'csecret',
                    tenantId: 'tid',
                  },
                  {
                    clientId: 'mi-cid',
                    tenantId: 'tid',
                    managedIdentityClientId: 'mi-id',
                  },
                  {
                    clientId: 'system-assigned',
                  },
                ],
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'azure',
          host: 'dev.azure.com',
          auth: [
            {
              method: 'pat',
              personalAccessToken: 'pat-token',
              organizations: ['acme'],
            },
            {
              method: 'clientCredentials',
              clientId: 'cid',
              clientSecret: 'csecret',
              tenantId: 'tid',
            },
            {
              method: 'managedIdentity',
              clientId: 'mi-cid',
              tenantId: 'tid',
              managedIdentityClientId: 'mi-id',
            },
            {
              method: 'managedIdentity',
              clientId: 'system-assigned',
            },
          ],
        },
      ]);
    });

    it('drops credential entries with no recognisable auth fields and drops commitSigningKey', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            azure: [
              {
                host: 'dev.azure.com',
                commitSigningKey: 'pgp',
                credentials: [{ organizations: ['acme'] }],
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        { type: 'azure', host: 'dev.azure.com', auth: [] },
      ]);
    });

    it('produces output that validates against the azure connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            azure: [
              {
                host: 'dev.azure.com',
                credentials: [{ personalAccessToken: 'pat' }],
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => AzureConnectionType.schema.parse(converted)).not.toThrow();
    });
  });

  describe('gerrit', () => {
    it('keeps addressing fields and emits a basic auth method', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gerrit: [
              {
                host: 'gerrit.example.com',
                baseUrl: 'https://gerrit.example.com',
                gitilesBaseUrl: 'https://gerrit.example.com/plugins/gitiles',
                cloneUrl: 'https://gerrit.example.com/clone',
                disableEditUrl: true,
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'gerrit',
          host: 'gerrit.example.com',
          baseUrl: 'https://gerrit.example.com',
          gitilesBaseUrl: 'https://gerrit.example.com/plugins/gitiles',
          cloneUrl: 'https://gerrit.example.com/clone',
          auth: [{ method: 'basic', username: 'user', password: 'pwd' }],
        },
      ]);
    });

    it('produces output that validates against the gerrit connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gerrit: [
              {
                host: 'gerrit.example.com',
                gitilesBaseUrl: 'https://gerrit.example.com/plugins/gitiles',
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => GerritConnectionType.schema.parse(converted)).not.toThrow();
    });
  });

  describe('gitea', () => {
    it('keeps host/baseUrl and emits a basic auth method', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitea: [
              {
                host: 'gitea.example.com',
                baseUrl: 'https://gitea.example.com',
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'gitea',
          host: 'gitea.example.com',
          baseUrl: 'https://gitea.example.com',
          auth: [{ method: 'basic', username: 'user', password: 'pwd' }],
        },
      ]);
    });

    it('produces output that validates against the gitea connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            gitea: [
              {
                host: 'gitea.example.com',
                username: 'user',
                password: 'pwd',
              },
            ],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => GiteaConnectionType.schema.parse(converted)).not.toThrow();
    });
  });

  describe('harness', () => {
    it('emits separate apiKey and token auth methods', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            harness: [
              {
                host: 'app.harness.io',
                apiKey: 'ak',
                token: 'tok',
              },
            ],
          },
        },
      });

      expect(getLegacyIntegrations(config)).toEqual([
        {
          type: 'harness',
          host: 'app.harness.io',
          auth: [
            { method: 'apiKey', apiKey: 'ak' },
            { method: 'token', token: 'tok' },
          ],
        },
      ]);
    });

    it('produces output that validates against the harness connection schema', () => {
      const config = mockServices.rootConfig({
        data: {
          integrations: {
            harness: [{ host: 'app.harness.io', apiKey: 'ak' }],
          },
        },
      });

      const [converted] = getLegacyIntegrations(config);
      expect(() => HarnessConnectionType.schema.parse(converted)).not.toThrow();
    });
  });
});
