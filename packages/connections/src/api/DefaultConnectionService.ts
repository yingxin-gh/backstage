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
import { ConnectionsService } from './ConnectionsService';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  ConnectionTypeKey,
  getConnectionType,
  isConnectionTypeKey,
} from '../definitions';
import { Connection, RootConnection } from './Connection';
import { JsonObject } from '@backstage/types';
import { InputError } from '@backstage/errors';
import { z } from 'zod/v4';

function describeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

class PluginConnectionsService implements ConnectionsService {
  private readonly logger: LoggerService;
  private readonly connections: Connection[];

  constructor(
    _pluginId: string,
    logger: LoggerService,
    connections: Connection[],
  ) {
    this.logger = logger;
    this.connections = connections;
  }

  async find<TType extends ConnectionTypeKey>({
    type,
    host,
  }: {
    type: TType;
    host: string;
  }): Promise<Connection<TType> | undefined> {
    this.logger.debug(
      `Finding connection of type "${type}" matching host "${host}"`,
    );
    return this.connections.find(
      c => c.type === type && (c as { host?: unknown }).host === host,
    ) as Connection<TType> | undefined;
  }
}

export class DefaultConnectionsService {
  private readonly logger: LoggerService;
  private readonly connections: RootConnection[];
  private readonly config: RootConfigService;

  private constructor(logger: LoggerService, config: RootConfigService) {
    this.logger = logger;
    this.config = config;
    this.connections = [];
    this.#registerConnectionsFromConfig();
  }

  static create(options: {
    logger: LoggerService;
    config: RootConfigService;
  }): DefaultConnectionsService {
    return new DefaultConnectionsService(options.logger, options.config);
  }

  #registerConnectionsFromConfig(): void {
    const cons = this.#readConnectionsFromConfig() as JsonObject[] | undefined;

    if (!cons) {
      return;
    }

    cons.forEach((v: JsonObject) => {
      try {
        this.connections.push(this.#validateConnection(v));
      } catch (e) {
        const type = typeof v.type === 'string' ? v.type : 'unknown';
        this.logger.error(
          `Failed to validate connection of type "${type}":\n${describeError(
            e,
          )}`,
        );
      }
    });

    this.logger.info(
      `Validated ${this.connections.length} of ${cons.length} connection${
        cons.length === 1 ? '' : 's'
      } from configuration`,
    );
  }

  #readConnectionsFromConfig() {
    return this.config.getOptional('connections');
  }

  #validateConnection(connection: JsonObject): RootConnection {
    if (typeof connection.type !== 'string') {
      throw new InputError(`Unrecognised connection type ${connection.type}`);
    }

    if (!isConnectionTypeKey(connection.type)) {
      throw new InputError(`Unrecognised connection type ${connection.type}`);
    }

    return getConnectionType(connection.type).schema.parse(
      connection,
    ) as RootConnection;
  }

  #getConnectionsForPlugin(pluginId: string): Connection[] {
    // Filter connections and hide auth methods based on these conditions:
    // 1. Include Connections with no plugin matcher condition
    // 2. Include Connections with a plugin matcher condition for this plugin
    // 3. Include auth methods with no plugin matcher condition
    // 4. Remove auth methods with a plugin matcher condition for other plugins
    return this.connections.flatMap(({ match, auth, ...rest }) => {
      if (match && !match.plugins.includes(pluginId)) {
        return [];
      }

      const matchingAuth = auth.reduce<Connection['auth']>(
        (acc, { match: authMatch, ...authRest }) => {
          if (authMatch && !authMatch.plugins.includes(pluginId)) {
            return acc;
          }
          acc.push(authRest as Connection['auth'][number]);
          return acc;
        },
        [],
      );

      return [{ ...rest, auth: matchingAuth } as Connection];
    });
  }

  forPlugin(
    pluginId: string,
    options?: {
      logger: LoggerService;
    },
  ): ConnectionsService {
    const logger = options?.logger ?? this.logger;
    return new PluginConnectionsService(
      pluginId,
      logger,
      this.#getConnectionsForPlugin(pluginId),
    );
  }
}
