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
import type {
  ConnectionAuthMethod,
  ConnectionType,
} from '../api/ConnectionType';

export function createConnectionType<
  TType extends string,
  TConfigSchema extends AnyZodObject,
  const TAuthMethods extends readonly ConnectionAuthMethod[],
>({
  configSchema,
  type,
  authMethods,
}: {
  configSchema: TConfigSchema;
  type: TType;
  authMethods: TAuthMethods;
}): ConnectionType<TType, TConfigSchema, TAuthMethods> {
  const authOptions = authMethods.map(am =>
    z.object({ method: z.literal(am.method), config: am.configSchema }),
  );
  const schema = z.object({
    type: z.literal(type),
    config: configSchema,
    auth: z.array(
      authOptions.length === 1
        ? authOptions[0]
        : z.discriminatedUnion(
            'method',
            authOptions as [(typeof authOptions)[0], ...typeof authOptions],
          ),
    ),
  });
  return {
    type,
    configSchema,
    authMethods,
    schema,
  };
}
