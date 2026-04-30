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
import { AzureConnectionType } from '../schema/azure';
import { BitbucketCloudConnectionType } from '../schema/bitbucketCloud';
import { BitbucketServerConnectionType } from '../schema/bitbucketServer';
import { GerritConnectionType } from '../schema/gerrit';
import { GiteaConnectionType } from '../schema/gitea';
import { GithubConnectionType } from '../schema/github';
import { GitlabConnectionType } from '../schema/gitlab';
import { HarnessConnectionType } from '../schema/harness';
import { ConnectionType } from '../api/ConnectionType';

export const connectionTypes = {
  azure: AzureConnectionType,
  'bitbucket-cloud': BitbucketCloudConnectionType,
  'bitbucket-server': BitbucketServerConnectionType,
  gerrit: GerritConnectionType,
  gitea: GiteaConnectionType,
  github: GithubConnectionType,
  gitlab: GitlabConnectionType,
  harness: HarnessConnectionType,
} as const satisfies { [K in string]: ConnectionType<K> };

export type ConnectionTypeKey = keyof typeof connectionTypes;

export type LookupConnectionType<T extends ConnectionTypeKey | ConnectionType> =
  T extends ConnectionTypeKey
    ? (typeof connectionTypes)[T]
    : Extract<T, ConnectionType>;

export type ConnectionMatch = {
  plugins: string[];
};
