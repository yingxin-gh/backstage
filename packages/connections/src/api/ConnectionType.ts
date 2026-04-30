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
import type { z } from 'zod/v4';

// Field names the framework owns at the connection level. Connection-type
// authors must not declare these in their `configSchema`.
export type ReservedConnectionFields = 'type' | 'auth' | 'match';

// Constrain a ZodObject so its inferred shape can't collide with framework
// keys. Resolves to `never` if a reserved key is present.
export type WithoutReservedFields<
  TSchema extends z.ZodObject,
  TReserved extends string,
> = Extract<keyof z.infer<TSchema>, TReserved> extends never ? TSchema : never;

export type ConnectionType<
  TType extends string = string,
  TConfigSchema extends z.ZodObject = z.ZodObject,
  TAuthMethods extends readonly ConnectionAuthMethod[] = readonly ConnectionAuthMethod[],
> = {
  type: TType;
  configSchema: TConfigSchema;
  authMethods: TAuthMethods;
  schema: z.ZodType;
  // TODO Add plugin match
};

export type ConnectionAuthMethod<
  TMethod extends string = string,
  TConfigSchema extends z.ZodObject = z.ZodObject,
> = {
  method: TMethod;
  configSchema: TConfigSchema;
  // TODO Add plugin match
};
