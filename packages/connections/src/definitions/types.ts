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
import { GithubConnectionType } from './github';
import { GitlabConnectionType } from './gitlab';
import { ConnectionType } from '../api/ConnectionType';

export const connectionTypes = {
  github: GithubConnectionType,
  gitlab: GitlabConnectionType,
} as const satisfies { [K in string]: ConnectionType<K> };

export type ConnectionTypeKey = keyof typeof connectionTypes;

// TODO inline lookup conncetion type
export type LookupConnectionType<T extends ConnectionTypeKey> =
  (typeof connectionTypes)[T];

export type ConnectionMatch = {
  plugins: string[];
};
