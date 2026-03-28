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
import { MarkdownContent } from '@backstage/core-components';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  Button,
  Cell,
  CellText,
  Column,
  Flex,
  Row,
  TableBody,
  TableHeader,
  TableRoot,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
} from 'json-schema';
import { FC, JSX } from 'react';
import { scaffolderTranslationRef } from '../../translation';
import { SchemaRenderContext, SchemaRenderStrategy } from './types';

const compositeSchemaProperties = ['allOf', 'anyOf', 'not', 'oneOf'] as const;

type subSchemasType = {
  [K in (typeof compositeSchemaProperties)[number]]?: JSONSchema7Definition[];
};

const getTypes = (schema: JSONSchema7) => {
  if (!schema.type) {
    if (
      Object.getOwnPropertyNames(schema).some(p =>
        compositeSchemaProperties.includes(p as any),
      )
    ) {
      return undefined;
    }
    return ['unknown'];
  }
  if (schema.type !== 'array') {
    return [schema.type].flat();
  }
  return [
    `${schema.type}(${
      (schema.items as JSONSchema7 | undefined)?.type ?? 'unknown'
    })`,
  ];
};

const getSubschemas = (schema: JSONSchema7Definition): subSchemasType => {
  if (typeof schema === 'boolean') {
    return {};
  }
  const base: Omit<JSONSchema7, keyof subSchemasType> = {};

  const subschemas: subSchemasType = {};

  for (const [key, value] of Object.entries(schema) as [
    keyof JSONSchema7,
    any,
  ][]) {
    if (compositeSchemaProperties.includes(key as keyof subSchemasType)) {
      let v;
      if (Array.isArray(value)) {
        if (!value.length) {
          continue;
        }
        v = value;
      } else if (value) {
        v = [value];
      } else {
        continue;
      }
      subschemas[key as keyof subSchemasType] = v as any;
    } else {
      base[key as Exclude<keyof JSONSchema7, keyof subSchemasType>] = value;
    }
  }
  if (!(base?.type === 'object' || 'properties' in base)) {
    return subschemas;
  }
  return Object.fromEntries(
    Object.entries(subschemas).map(([key, sub]) => {
      const mergedSubschema = sub.map(alt => {
        if (typeof alt !== 'boolean' && alt.required) {
          const properties: JSONSchema7['properties'] = {};
          if (schema.properties) {
            for (const k of alt.required) {
              if (k in schema.properties) {
                properties[k] = schema.properties[k];
              }
            }
          }
          Object.assign(properties, alt.properties);
          return {
            ...base,
            ...alt,
            properties,
          };
        }
        return alt;
      });
      return [key, mergedSubschema];
    }),
  );
};

type SchemaRenderElement = {
  schema: JSONSchema7Definition;
  key?: string;
  required?: boolean;
};

type RenderColumn = (
  element: SchemaRenderElement,
  context: SchemaRenderContext,
) => JSX.Element;

type ColumnDef = {
  key: string;
  title: string;
  render: RenderColumn;
  width?: `${number}fr`;
};

const generateId = (
  element: SchemaRenderElement,
  context: SchemaRenderContext,
) => {
  return element.key ? `${context.parentId}.${element.key}` : context.parentId;
};

const enumFrom = (schema: JSONSchema7) => {
  if (schema.type === 'array') {
    if (schema.items && typeof schema.items !== 'boolean') {
      if (Array.isArray(schema.items)) {
        const itemsWithEnum = schema.items
          .filter(e => typeof e === 'object' && 'enum' in e)
          .map(e => e as JSONSchema7);
        if (itemsWithEnum.length) {
          return itemsWithEnum[0].enum;
        }
      } else {
        return schema.items?.enum;
      }
    }
    return undefined;
  }
  return schema.enum;
};

const inspectSchema = (
  schema: JSONSchema7Definition,
): {
  canSubschema: boolean;
  hasEnum: boolean;
} => {
  if (typeof schema === 'boolean') {
    return { canSubschema: false, hasEnum: false };
  }
  return {
    canSubschema:
      Object.getOwnPropertyNames(schema).some(p =>
        compositeSchemaProperties.includes(p as any),
      ) || getTypes(schema)!.some(t => t.includes('object')),
    hasEnum: !!enumFrom(schema),
  };
};

export const RenderEnum: FC<{
  e: JSONSchema7Type[];
  [key: string]: any;
}> = ({ e, ...props }: { e: JSONSchema7Type[] }) => {
  return (
    <ul {...props} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {e.map((v, i) => {
        const text = JSON.stringify(v);
        const isComplex = v !== null && ['object', 'array'].includes(typeof v);
        return (
          <li key={i} style={{ padding: '2px 0' }}>
            <Flex gap="2" align="center">
              <Text
                as="span"
                variant="body-small"
                data-testid={`enum_el${i}`}
                style={{ fontFamily: 'monospace' }}
              >
                {text}
              </Text>
              {isComplex && (
                <TooltipTrigger>
                  <Button
                    data-testid={`wrap-text_${i}`}
                    variant="tertiary"
                    size="small"
                  >
                    ↵
                  </Button>
                  <Tooltip>
                    <Text
                      as="span"
                      data-testid={`pretty_${i}`}
                      style={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(v, undefined, 2)}
                    </Text>
                  </Tooltip>
                </TooltipTrigger>
              )}
            </Flex>
          </li>
        );
      })}
    </ul>
  );
};

export const RenderSchema = ({
  strategy,
  context,
  schema,
}: {
  strategy: SchemaRenderStrategy;
  context: SchemaRenderContext;
  schema?: JSONSchema7Definition;
}) => {
  const { t } = useTranslationRef(scaffolderTranslationRef);

  const result = (() => {
    if (typeof schema === 'object') {
      const subschemas = getSubschemas(schema);
      let columns: ColumnDef[] | undefined;
      let elements: SchemaRenderElement[] | undefined;
      if (strategy === 'root') {
        if ('type' in schema || !Object.keys(subschemas).length) {
          elements = [{ schema }];
          columns = [
            {
              key: 'value',
              title: t('renderSchema.tableCell.value'),
              render: renderValueCell,
              width: '3fr',
            },
          ];
        }
      } else if (schema.properties) {
        columns = [
          {
            key: 'name',
            title: t('renderSchema.tableCell.name'),
            render: renderNameCell,
            width: '1fr',
          },
          {
            key: 'value',
            title: t('renderSchema.tableCell.value'),
            render: renderValueCell,
            width: '4fr',
          },
        ];
        elements = Object.entries(schema.properties!).map(([key, v]) => ({
          schema: v,
          key,
          required: schema.required?.includes(key),
        }));
      } else if (!Object.keys(subschemas).length) {
        return undefined;
      }
      const [isExpanded, setIsExpanded] = context.expanded;

      return (
        <Flex direction="column" gap="2">
          {columns && elements && (
            <TableRoot
              data-testid={`${strategy}_${context.parentId}`}
              aria-label={`${strategy} schema for ${context.parentId}`}
            >
              <TableHeader>
                {columns.map((col, index) => (
                  <Column
                    key={col.key}
                    id={col.key}
                    isRowHeader={index === 0}
                    defaultWidth={col.width ?? undefined}
                  >
                    {col.title}
                  </Column>
                ))}
              </TableHeader>
              <TableBody>
                {elements.map(el => (
                  <Row
                    key={generateId(el, context)}
                    id={`${strategy}-row_${generateId(el, context)}`}
                    data-testid={`${strategy}-row_${generateId(el, context)}`}
                    columns={columns}
                  >
                    {col => col.render(el, context)}
                  </Row>
                ))}
              </TableBody>
            </TableRoot>
          )}
          {(Object.keys(subschemas) as Array<keyof subSchemasType>).map(sk => {
            const subId = `${context.parentId}_${sk}`;
            const isSubOpen = isExpanded[subId];
            return (
              <Flex key={sk} direction="column" gap="2">
                <Button
                  data-testid={`expand_${subId}`}
                  variant="tertiary"
                  size="small"
                  onPress={() =>
                    setIsExpanded(prevState => ({
                      ...prevState,
                      [subId]: !prevState[subId],
                    }))
                  }
                  style={{ alignSelf: 'flex-start' }}
                >
                  {isSubOpen ? '▴' : '▾'} {sk}
                </Button>
                {isSubOpen &&
                  subschemas[sk]!.map((sub, index) => (
                    <RenderSchema
                      key={index}
                      strategy={
                        typeof sub !== 'boolean' && 'properties' in sub
                          ? strategy
                          : 'root'
                      }
                      context={{
                        ...context,
                        parentId: `${context.parentId}_${sk}${index}`,
                      }}
                      schema={sub}
                    />
                  ))}
              </Flex>
            );
          })}
        </Flex>
      );
    }
    return undefined;
  })();
  return result ?? <Text as="p">No schema defined</Text>;
};

function RenderExpansion({
  element,
  context,
}: {
  element: SchemaRenderElement;
  context: SchemaRenderContext;
}) {
  const id = generateId(element, context);
  const info = inspectSchema(element.schema);
  const hasDetails =
    typeof element.schema !== 'boolean' && (info.canSubschema || info.hasEnum);
  const s =
    typeof element.schema !== 'boolean'
      ? (element.schema as JSONSchema7)
      : undefined;
  const [isExpanded] = context.expanded;
  const isOpen = hasDetails && s && (!getTypes(s) || isExpanded[id]);

  if (!isOpen) {
    return null;
  }

  return (
    <div data-testid={`expansion_${id}`} style={{ paddingLeft: 16 }}>
      {info.canSubschema && (
        <RenderSchema
          strategy="properties"
          context={{
            ...context,
            parentId: id,
            parent: context,
          }}
          schema={
            s!.type === 'array' ? (s!.items as JSONSchema7 | undefined) : s
          }
        />
      )}
      {info.hasEnum && (
        <>
          <Text as="h4" variant="title-small" weight="bold">
            Valid values:
          </Text>
          <RenderEnum data-testid={`enum_${id}`} e={enumFrom(s!)!} />
        </>
      )}
    </div>
  );
}

function renderNameCell(
  element: SchemaRenderElement,
  _context: SchemaRenderContext,
) {
  const name = element.key ?? '';
  return <CellText title={element.required ? `${name} *` : name} />;
}

function renderValueCell(
  element: SchemaRenderElement,
  context: SchemaRenderContext,
) {
  if (typeof element.schema === 'boolean') {
    return <CellText title={element.schema ? 'any' : 'none'} />;
  }
  const types = getTypes(element.schema);
  const [isExpanded, setIsExpanded] = context.expanded;
  const id = generateId(element, context);
  const info = inspectSchema(element.schema);
  const description = element.schema.description;
  return (
    <Cell>
      <Flex direction="column" gap="1">
        <Flex gap="1" align="center">
          {types?.map((type, index) =>
            (info.canSubschema || info.hasEnum) && index === 0 ? (
              <Button
                key={type}
                data-testid={`expand_${id}`}
                variant="tertiary"
                size="small"
                onPress={() =>
                  setIsExpanded(prevState => ({
                    ...prevState,
                    [id]: !prevState[id],
                  }))
                }
              >
                {isExpanded[id] ? '▴' : '▾'} {type}
              </Button>
            ) : (
              <Text
                key={type}
                as="span"
                variant="body-small"
                style={{ fontFamily: 'monospace' }}
              >
                {type}
              </Text>
            ),
          )}
        </Flex>
        {description && <MarkdownContent content={description} />}
        <RenderExpansion element={element} context={context} />
      </Flex>
    </Cell>
  );
}
