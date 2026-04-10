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

// -----------------------------------------------------------------------
//  Mock / exploration file — not wired into anything.
//
//  Shows what a central, reusable Standard-Schema-based utility could
//  look like, covering:
//
//    1. Public types for APIs that accept per-field schema records
//    2. Type-level inference (output & input) without any zod types
//    3. Runtime validation with good error messages
//    4. JSON Schema generation from any supported source
//    5. Backward compat with the current (zImpl) => ZodType factory form
//    6. Merging schemas from different sources (blueprint + override)
// -----------------------------------------------------------------------

import { JsonObject } from '@backstage/types';
import { z as zodV3, type ZodType } from 'zod/v3';
import zodToJsonSchema from 'zod-to-json-schema';
import { PortableSchema } from './types';

/**
 * The Standard Schema interface.
 * @public
 */
export type { StandardSchemaV1 } from '@standard-schema/spec';
import { type StandardSchemaV1 } from '@standard-schema/spec';

// ---------------------------------------------------------------------------
//  Public types
// ---------------------------------------------------------------------------

/**
 * A single config field schema. Accepts any Standard Schema implementation,
 * or the legacy factory form for backward compat.
 * @public
 */
export type ConfigFieldSchema =
  | StandardSchemaV1
  | ((zImpl: typeof zodV3) => ZodType);

/**
 * A record of per-field config schemas.
 * @public
 */
export type ConfigSchemaRecord = { [key: string]: ConfigFieldSchema };

/**
 * Infers the parsed output type of a config schema record.
 * Replaces: `{ [key in keyof T]: z.infer<ReturnType<T[key]>> }`
 *
 * Split into two mapped types joined by intersection to avoid conditional
 * types in the value position, which TypeScript defers in declaration emit.
 * Factory-form fields use `ReturnType<...>['_output']` (eagerly evaluated),
 * Standard Schema fields use `['~standard']['types']['output']`.
 * @ignore
 */
type InferConfigOutput<T extends ConfigSchemaRecord> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? K
    : never]: ReturnType<T[K] & ((...args: any[]) => any)>['_output'];
} & {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? never
    : K]: NonNullable<
    (T[K] & StandardSchemaV1)['~standard']['types']
  >['output'];
};

/**
 * Infers the raw input type (before defaults/transforms) of a config
 * schema record.
 * Replaces: `z.input<z.ZodObject<{ ... }>>`
 *
 * Fields whose input type includes `undefined` are made optional keys,
 * matching the behavior of `z.input<z.ZodObject<...>>` for ZodDefault
 * and ZodOptional fields.
 * @ignore
 */
type InferConfigInput<T extends ConfigSchemaRecord> = _RequiredInput<T> &
  _OptionalInput<T>;

type _FactoryInput<T extends (...args: any[]) => any> = ReturnType<T>['_input'];
type _SchemaInput<T extends StandardSchemaV1> = NonNullable<
  T['~standard']['types']
>['input'];

/** @ignore */
type _RequiredInput<T extends ConfigSchemaRecord> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? undefined extends _FactoryInput<T[K] & ((...args: any[]) => any)>
      ? never
      : K
    : undefined extends _SchemaInput<T[K] & StandardSchemaV1>
    ? never
    : K]: T[K] extends (...args: any[]) => any
    ? _FactoryInput<T[K] & ((...args: any[]) => any)>
    : _SchemaInput<T[K] & StandardSchemaV1>;
};

/** @ignore */
type _OptionalInput<T extends ConfigSchemaRecord> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? undefined extends _FactoryInput<T[K] & ((...args: any[]) => any)>
      ? K
      : never
    : undefined extends _SchemaInput<T[K] & StandardSchemaV1>
    ? K
    : never]?: T[K] extends (...args: any[]) => any
    ? _FactoryInput<T[K] & ((...args: any[]) => any)>
    : _SchemaInput<T[K] & StandardSchemaV1>;
};

// ---------------------------------------------------------------------------
//  The PortableSchema — now with per-field tracking for mergeability
// ---------------------------------------------------------------------------

/**
 * Internally, each PortableSchema tracks which keys it owns and how to
 * validate each one individually. This is the unit of composition: when a
 * blueprint defines config fields and an override adds more, each produces
 * its own PortableSchema and they're merged at the end.
 */
interface FieldValidator {
  validate(value: unknown): { value: unknown } | { errors: string[] };
  jsonSchema: JsonObject;
  required: boolean;
}

/**
 * Internal representation that carries per-field validators alongside the
 * public PortableSchema surface. The brand field is used to detect whether
 * a PortableSchema came from this utility (and thus supports merging).
 */
export interface MergeablePortableSchema<TOutput = any, TInput = any>
  extends PortableSchema<TOutput, TInput> {
  /** @internal */
  readonly _fields: Record<string, FieldValidator>;
}

// ---------------------------------------------------------------------------
//  createPortableSchema — builds from a field record
// ---------------------------------------------------------------------------

export function createPortableSchema<T extends ConfigSchemaRecord>(
  fields: T,
): MergeablePortableSchema<InferConfigOutput<T>, InferConfigInput<T>> {
  const fieldValidators: Record<string, FieldValidator> = {};

  for (const [key, field] of Object.entries(fields)) {
    const resolved = typeof field === 'function' ? field(zodV3) : field;
    fieldValidators[key] = buildFieldValidator(key, resolved);
  }

  return buildPortableSchema(fieldValidators);
}

// ---------------------------------------------------------------------------
//  mergePortableSchemas — combines schemas from different sources
//
//  This is the key operation for blueprint + override composition. Each
//  source may use a completely different schema library. Because we track
//  per-field validators, merging is just combining the field maps —
//  no need to mix schema types within a single validator.
// ---------------------------------------------------------------------------

export function mergePortableSchemas<A, B>(
  a: MergeablePortableSchema<A> | undefined,
  b: MergeablePortableSchema<B> | undefined,
): MergeablePortableSchema<A & B> | undefined {
  if (!a && !b) {
    return undefined;
  }
  if (!a) {
    return b as MergeablePortableSchema<A & B>;
  }
  if (!b) {
    return a as MergeablePortableSchema<A & B>;
  }

  return buildPortableSchema<A & B>({
    ...a._fields,
    ...b._fields,
  });
}

// ---------------------------------------------------------------------------
//  buildPortableSchema — internal: produces a PortableSchema from a
//  field validator map. This is the shared implementation for both
//  createPortableSchema and mergePortableSchemas.
// ---------------------------------------------------------------------------

function buildPortableSchema<TOutput>(
  fieldValidators: Record<string, FieldValidator>,
): MergeablePortableSchema<TOutput> {
  const jsonSchema = buildObjectJsonSchema(fieldValidators);

  return {
    parse(input) {
      const inputObj = (input ?? {}) as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      const errors: string[] = [];

      for (const [key, validator] of Object.entries(fieldValidators)) {
        const validated = validator.validate(inputObj[key]);
        if ('errors' in validated) {
          errors.push(...validated.errors);
        } else {
          result[key] = validated.value;
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      return result as TOutput;
    },

    schema: jsonSchema,

    _fields: fieldValidators,
  };
}

// ---------------------------------------------------------------------------
//  buildFieldValidator — wraps a single schema (any type) into a
//  normalized FieldValidator with validation, JSON Schema, and required.
// ---------------------------------------------------------------------------

function buildFieldValidator(key: string, schema: unknown): FieldValidator {
  if (isZodV3Type(schema)) {
    return buildZodFieldValidator(key, schema);
  }
  if (isStandardSchema(schema)) {
    return buildStandardFieldValidator(key, schema);
  }
  throw new Error(
    `Config schema for field '${key}' is not a valid Standard Schema or zod schema`,
  );
}

function buildZodFieldValidator(key: string, schema: ZodType): FieldValidator {
  // Wrap the single field in a one-key z.object so we get proper zod
  // object-level behavior (default application, optional handling, etc.)
  const wrapper = zodV3.object({ [key]: schema });
  const wholeJsonSchema = zodToJsonSchema(wrapper) as Record<string, any>;

  return {
    validate(value) {
      const result = wrapper.safeParse({ [key]: value });
      if (result.success) {
        return { value: result.data[key] };
      }
      return { errors: result.error.issues.map(formatZodIssue) };
    },
    jsonSchema: (wholeJsonSchema.properties?.[key] ?? {}) as JsonObject,
    required: (wholeJsonSchema.required ?? []).includes(key),
  };
}

function buildStandardFieldValidator(
  key: string,
  schema: StandardSchemaV1,
): FieldValidator {
  let fieldJsonSchema: JsonObject;
  if (hasJsonSchemaConverter(schema)) {
    const raw = schema['~standard'].jsonSchema.input({ target: 'draft-07' });
    const { $schema: _, ...rest } = raw;
    fieldJsonSchema = rest as JsonObject;
  } else {
    throw new Error(
      `Config schema for field '${key}' does not support JSON Schema conversion`,
    );
  }

  const required = isFieldRequired(schema);

  return {
    validate(value) {
      const result = schema['~standard'].validate(value);
      if (result instanceof Promise) {
        throw new Error(
          `Config schema for '${key}' returned a Promise — async schemas are not supported`,
        );
      }
      if (result.issues) {
        return {
          errors: Array.from(result.issues).map(issue =>
            formatStandardIssue(key, issue),
          ),
        };
      }
      return { value: result.value };
    },
    jsonSchema: fieldJsonSchema,
    required,
  };
}

// ---------------------------------------------------------------------------
//  buildObjectJsonSchema — assembles per-field JSON Schemas into a
//  single object-level JSON Schema
// ---------------------------------------------------------------------------

function buildObjectJsonSchema(
  fieldValidators: Record<string, FieldValidator>,
): JsonObject {
  const properties: Record<string, JsonObject> = {};
  const required: string[] = [];

  for (const [key, validator] of Object.entries(fieldValidators)) {
    properties[key] = validator.jsonSchema;
    if (validator.required) {
      required.push(key);
    }
  }

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
    additionalProperties: false,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema as JsonObject;
}

// ---------------------------------------------------------------------------
//  Detection helpers
// ---------------------------------------------------------------------------

function isZodV3Type(value: unknown): value is ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any)._parse === 'function' &&
    '_def' in value
  );
}

function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    '~standard' in value &&
    typeof (value as any)['~standard']?.validate === 'function'
  );
}

function hasJsonSchemaConverter(
  schema: StandardSchemaV1,
): schema is StandardSchemaV1 & {
  '~standard': { jsonSchema: { input: Function } };
} {
  const std = schema['~standard'] as any;
  return typeof std?.jsonSchema?.input === 'function';
}

function isFieldRequired(schema: StandardSchemaV1): boolean {
  const result = schema['~standard'].validate(undefined);
  if (result instanceof Promise) {
    return true;
  }
  return (result.issues?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
//  Error formatting
// ---------------------------------------------------------------------------

function formatZodIssue(issue: {
  code: string;
  message: string;
  path: Array<string | number>;
  unionErrors?: Array<{ issues: Array<any> }>;
}): string {
  if (issue.code === 'invalid_union' && issue.unionErrors?.[0]?.issues?.[0]) {
    return formatZodIssue(issue.unionErrors[0].issues[0]);
  }
  let message = issue.message;
  if (message === 'Required') {
    message = 'Missing required value';
  }
  if (issue.path.length) {
    message += ` at '${issue.path.join('.')}'`;
  }
  return message;
}

function formatStandardIssue(
  fieldKey: string,
  issue: StandardSchemaV1.Issue,
): string {
  let message = issue.message;
  if (message === 'Required') {
    message = 'Missing required value';
  }
  const path = issue.path?.length
    ? `${fieldKey}.${issue.path
        .map((p: PropertyKey | StandardSchemaV1.PathSegment) =>
          typeof p === 'object' ? p.key : p,
        )
        .join('.')}`
    : fieldKey;
  return `${message} at '${path}'`;
}

// ---------------------------------------------------------------------------
//  Deprecation warning
// ---------------------------------------------------------------------------

let hasWarnedConfigSchemaProp = false;

/** @internal */
export function warnConfigSchemaPropDeprecation() {
  if (!hasWarnedConfigSchemaProp) {
    hasWarnedConfigSchemaProp = true;
    // eslint-disable-next-line no-console
    console.warn(
      'DEPRECATION WARNING: The `config.schema` option for extension config is deprecated. ' +
        'Use the `configSchema` option instead with Standard Schema values, for example ' +
        '`configSchema: { title: z.string() }` using zod v3.25+ or v4.',
    );
  }
}
