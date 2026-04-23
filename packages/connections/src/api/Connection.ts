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
import { AnyZodObject, z } from 'zod/v3';
import { ConnectionTypeKey, LookupConnectionType } from '../definitions/lookup';
import { ConnectionAuthMethod, ConnectionType } from './ConnectionType';

type ConnectionAuthValue<TAuthMethod extends ConnectionAuthMethod> =
  TAuthMethod extends ConnectionAuthMethod<infer TMethod, infer TConfigSchema>
    ? { method: TMethod; config: z.infer<TConfigSchema> }
    : never;

export type Connection<
  T extends ConnectionType<
    ConnectionTypeKey,
    AnyZodObject,
    readonly ConnectionAuthMethod[]
  >,
> = {
  type: T['type'];
  config: z.infer<T['configSchema']>;
  auth: Array<ConnectionAuthValue<T['authMethods'][number]>>;
};

export type AnyConnection = {
  [K in ConnectionTypeKey]: Connection<LookupConnectionType<K>>;
}[ConnectionTypeKey];
