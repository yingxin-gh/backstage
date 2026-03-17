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

import { resolveAuth } from './resolveAuth';
import { CliAuth, type StoredInstance } from '@backstage/cli-node';

jest.mock('@backstage/cli-node', () => {
  const actual = jest.requireActual('@backstage/cli-node');
  return {
    ...actual,
    CliAuth: { create: jest.fn() },
  };
});

const mockCreate = CliAuth.create as jest.MockedFunction<typeof CliAuth.create>;

describe('resolveAuth', () => {
  const mockInstance: StoredInstance = {
    name: 'production',
    baseUrl: 'https://backstage.example.com',
    clientId: 'my-client',
    issuedAt: Date.now(),
    accessTokenExpiresAt: Date.now() + 3600_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves auth with the selected instance and stored token', async () => {
    mockCreate.mockResolvedValue({
      instance: mockInstance,
      instanceName: mockInstance.name,
      baseUrl: mockInstance.baseUrl,
      getAccessToken: jest.fn().mockResolvedValue('test-access-token'),
      getConfig: jest.fn().mockResolvedValue(['catalog', 'scaffolder']),
    } as unknown as CliAuth);

    const result = await resolveAuth();

    expect(mockCreate).toHaveBeenCalledWith({ instanceName: undefined });
    expect(result).toEqual({
      instance: mockInstance,
      accessToken: 'test-access-token',
      pluginSources: ['catalog', 'scaffolder'],
    });
  });

  it('passes instance name flag to CliAuth.create', async () => {
    mockCreate.mockResolvedValue({
      instance: mockInstance,
      instanceName: mockInstance.name,
      baseUrl: mockInstance.baseUrl,
      getAccessToken: jest.fn().mockResolvedValue('test-access-token'),
      getConfig: jest.fn().mockResolvedValue([]),
    } as unknown as CliAuth);

    await resolveAuth('staging');

    expect(mockCreate).toHaveBeenCalledWith({ instanceName: 'staging' });
  });

  it('throws when getAccessToken fails', async () => {
    mockCreate.mockResolvedValue({
      instance: mockInstance,
      instanceName: mockInstance.name,
      baseUrl: mockInstance.baseUrl,
      getAccessToken: jest
        .fn()
        .mockRejectedValue(
          new Error('No access token found. Run "auth login" to authenticate.'),
        ),
      getConfig: jest.fn().mockResolvedValue([]),
    } as unknown as CliAuth);

    await expect(resolveAuth()).rejects.toThrow(
      'No access token found. Run "auth login" to authenticate.',
    );
  });

  it('returns empty plugin sources when none are configured', async () => {
    mockCreate.mockResolvedValue({
      instance: mockInstance,
      instanceName: mockInstance.name,
      baseUrl: mockInstance.baseUrl,
      getAccessToken: jest.fn().mockResolvedValue('test-access-token'),
      getConfig: jest.fn().mockResolvedValue(undefined),
    } as unknown as CliAuth);

    const result = await resolveAuth();

    expect(result.pluginSources).toEqual([]);
  });
});
