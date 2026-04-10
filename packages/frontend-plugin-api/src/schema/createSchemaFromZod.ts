/*
 * Copyright 2023 The Backstage Authors
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

import { JsonObject } from '@backstage/types';
import { z, type ZodIssue, type ZodType } from 'zod/v3';
import zodToJsonSchema from 'zod-to-json-schema';
import { PortableSchema } from './types';

/**
 * @internal
 * @deprecated Use {@link createConfigSchema} instead.
 */
export function createSchemaFromZod<TSchema extends ZodType>(
  schemaCreator: (zImpl: typeof z) => TSchema,
): PortableSchema<z.output<TSchema>, z.input<TSchema>> {
  const schema = schemaCreator(z);

  let cached: PortableSchema['schema'] | undefined;

  const result: PortableSchema<z.output<TSchema>, z.input<TSchema>> = {
    parse: input => {
      const parseResult = schema.safeParse(input);
      if (parseResult.success) {
        return parseResult.data;
      }
      throw new Error(parseResult.error.issues.map(formatIssue).join('; '));
    },
    schema: undefined as any,
  };

  Object.defineProperty(result, 'schema', {
    get() {
      if (!cached) {
        const jsonSchema = zodToJsonSchema(schema) as JsonObject;
        cached = Object.assign(
          () => ({ schema: jsonSchema }),
          jsonSchema,
        ) as PortableSchema['schema'];
      }
      return cached;
    },
    configurable: true,
    enumerable: true,
  });

  return result;
}

function formatIssue(issue: ZodIssue): string {
  if (issue.code === 'invalid_union') {
    return formatIssue(issue.unionErrors[0].issues[0]);
  }
  let message = issue.message;
  if (message === 'Required') {
    message = `Missing required value`;
  }
  if (issue.path.length) {
    message += ` at '${issue.path.join('.')}'`;
  }
  return message;
}
