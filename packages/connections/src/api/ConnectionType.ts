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
import { AnyZodObject } from 'zod/v3';

export type ConnectionType<
  TType extends string,
  TConfigSchema extends AnyZodObject,
  TAuthMethods extends readonly ConnectionAuthMethod[] = readonly ConnectionAuthMethod[],
> = {
  type: TType;
  configSchema: TConfigSchema;
  authMethods: TAuthMethods;
};

export type ConnectionAuthMethod<
  TMethod extends string = string,
  TConfigSchema extends AnyZodObject = AnyZodObject,
> = {
  method: TMethod;
  configSchema: TConfigSchema;
};
