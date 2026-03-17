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

import { NotFoundError } from '@backstage/errors';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

const METADATA_FILE = 'auth-instances.yaml';

const INSTANCE_NAME_PATTERN = /^[a-zA-Z0-9._:@-]+$/;

const storedInstanceSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(INSTANCE_NAME_PATTERN, 'Instance name contains invalid characters'),
  baseUrl: z.string().url(),
  clientId: z.string().min(1),
  issuedAt: z.number().int().nonnegative(),
  accessTokenExpiresAt: z.number().int().nonnegative(),
  selected: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/** @public */
export type StoredInstance = {
  name: string;
  baseUrl: string;
  clientId: string;
  issuedAt: number;
  accessTokenExpiresAt: number;
  selected?: boolean;
  config?: Record<string, unknown>;
};

const authYamlSchema = z.object({
  instances: z.array(storedInstanceSchema).default([]),
});

/** @internal */
export function getMetadataFilePath(): string {
  const root =
    process.env.XDG_CONFIG_HOME ||
    (process.platform === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : path.join(os.homedir(), '.config'));

  return path.join(root, 'backstage-cli', METADATA_FILE);
}

/** @internal */
export async function readAll(): Promise<{ instances: StoredInstance[] }> {
  const file = getMetadataFilePath();
  if (!(await fs.pathExists(file))) {
    return { instances: [] };
  }
  const text = await fs.readFile(file, 'utf8');
  if (!text.trim()) {
    return { instances: [] };
  }
  try {
    const doc = YAML.parse(text);
    const parsed = authYamlSchema.safeParse(doc);
    if (parsed.success) {
      return parsed.data;
    }
    return { instances: [] };
  } catch {
    return { instances: [] };
  }
}

/** @internal */
export async function getAllInstances(): Promise<{
  instances: StoredInstance[];
  selected: StoredInstance | undefined;
}> {
  const { instances } = await readAll();
  const selected = instances.find(i => i.selected) ?? instances[0];
  return {
    instances: instances.map(i => ({
      ...i,
      selected: i.name === selected.name,
    })),
    selected,
  };
}

/** @internal */
export async function getSelectedInstance(
  instanceName?: string,
): Promise<StoredInstance> {
  if (instanceName) {
    return await getInstanceByName(instanceName);
  }
  const { selected } = await getAllInstances();
  if (!selected) {
    throw new Error(
      'No instances found. Run "auth login" to authenticate first.',
    );
  }
  return selected;
}

/** @internal */
export async function getInstanceByName(name: string): Promise<StoredInstance> {
  const { instances } = await readAll();
  const instance = instances.find(i => i.name === name);
  if (!instance) {
    throw new NotFoundError(`Instance '${name}' not found`);
  }
  return instance;
}

/** @internal */
export async function getInstanceConfig<T = unknown>(
  instanceName: string,
  key: string,
): Promise<T | undefined> {
  const instance = await getInstanceByName(instanceName);
  return instance.config?.[key] as T | undefined;
}

/** @internal */
export function accessTokenNeedsRefresh(instance: StoredInstance): boolean {
  // 2 minutes before expiration
  return instance.accessTokenExpiresAt <= Date.now() + 2 * 60_000;
}
