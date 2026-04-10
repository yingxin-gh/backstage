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

import {
  createConfigSchema,
  mergePortableSchemas,
} from './createPortableSchema';

describe('createConfigSchema', () => {
  it('should provide nice parse errors', () => {
    const schema = createConfigSchema({
      foo: z => z.union([z.string(), z.number()]),
      derp: z => z.object({ bar: z.number() }),
    });

    expect(() => {
      return schema.parse({ derp: { bar: 'derp' } });
    }).toThrow(
      `Missing required value at 'foo'; Expected number, received string at 'derp.bar'`,
    );
    expect(() => {
      return schema.parse(undefined);
    }).toThrow(`Missing required value at 'foo'`);
  });

  it('should parse valid config', () => {
    const schema = createConfigSchema({
      name: z => z.string(),
      count: z => z.number().default(0),
    });

    expect(schema.parse({ name: 'hello' })).toEqual({
      name: 'hello',
      count: 0,
    });
    expect(schema.parse({ name: 'hi', count: 5 })).toEqual({
      name: 'hi',
      count: 5,
    });
  });

  it('should generate JSON Schema lazily via schema()', () => {
    const schema = createConfigSchema({
      title: z => z.string(),
      count: z => z.number().optional(),
    });

    const result = schema.schema();
    expect(result).toHaveProperty('schema');
    expect(result.schema).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['title'],
      additionalProperties: false,
    });
  });

  it('should support backward-compatible property access on schema', () => {
    const schema = createConfigSchema({
      title: z => z.string(),
    });

    expect(schema.schema.type).toBe('object');
    expect(schema.schema.properties).toBeDefined();
  });

  it('should support merging schemas', () => {
    const a = createConfigSchema({
      name: z => z.string(),
    });
    const b = createConfigSchema({
      count: z => z.number().default(0),
    });

    const merged = mergePortableSchemas(a, b)!;
    expect(merged.parse({ name: 'hello' })).toEqual({
      name: 'hello',
      count: 0,
    });

    const result = merged.schema();
    expect(result.schema).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['name'],
    });
  });

  it('should handle merge with undefined', () => {
    const a = createConfigSchema({ name: z => z.string() });

    expect(mergePortableSchemas(a, undefined)).toBe(a);
    expect(mergePortableSchemas(undefined, a)).toBe(a);
    expect(mergePortableSchemas(undefined, undefined)).toBeUndefined();
  });
});
