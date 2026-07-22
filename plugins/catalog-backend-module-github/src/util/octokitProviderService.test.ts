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
import type { GithubCredentialsProvider } from '@backstage/integration';
import { DefaultOctokitProvider } from './octokitProviderService';

describe('DefaultOctokitProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('partitions cached clients by organization', async () => {
    const config = mockServices.rootConfig({
      data: {
        integrations: {
          github: [{ host: 'github.com', token: 'token' }],
        },
      },
    });
    const githubCredentials: GithubCredentialsProvider = {
      getCredentials: jest.fn().mockResolvedValue({
        type: 'token',
        token: 'token',
        headers: { Authorization: 'token token' },
      }),
    };
    const provider = new DefaultOctokitProvider(config, githubCredentials);

    const backstage = await provider.getOctokit(
      'https://github.com/backstage/backstage',
    );
    const backstageCommunity = await provider.getOctokit(
      'https://github.com/backstage/community',
    );
    const spotify = await provider.getOctokit(
      'https://github.com/spotify/backstage',
    );

    expect(backstageCommunity).toBe(backstage);
    expect(spotify).not.toBe(backstage);
  });
});
