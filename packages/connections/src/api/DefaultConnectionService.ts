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
  LookupConnectionType,
} from '../definitions';
import { Connection } from './Connection';
import { JsonObject } from '@backstage/types';

class PluginConnectionsService implements ConnectionsService {
  private readonly logger: LoggerService;
  private readonly pluginId: string;
  private readonly connections: Connection[];

  constructor(
    pluginId: string,
    logger: LoggerService,
    connections: Connection[],
  ) {
    this.pluginId = pluginId;
    this.logger = logger;
    this.connections = connections;
  }

  async find<TType extends ConnectionTypeKey>({
    type,
    host,
  }: {
    type: TType;
    host: string;
  }): Promise<Connection<LookupConnectionType<TType>> | undefined> {
    const connectionsMatchingType = this.connections.filter(
      ({ type: conType }) => conType === type,
    );
    return connectionsMatchingType.find(
      ({ config: { host: conHost } }) => conHost === host,
    ) as Connection<LookupConnectionType<TType>> | undefined;
  }
}

export class DefaultConnectionsService {
  private readonly logger: LoggerService;
  private readonly connections: Connection[];
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

    try {
      cons.forEach((v: JsonObject) => {
        const coercedConnection = this.#coerceConfigurationConnection(v);
        const validatedConnection = this.#validateConnection(coercedConnection);
        this.connections.push(validatedConnection);
      });
    } catch (e) {
      this.logger.error(
        'Was not able to validate connections from configuration',
      );
      console.log(e);
      return;
    }

    this.logger.info(
      `Validated ${cons.length} connection${
        cons.length > 1 ? 's' : ''
      } from configuration`,
    );
  }

  #readConnectionsFromConfig() {
    return this.config.getOptional('connections');
  }

  // Blind coercion - still needs validation
  #coerceConfigurationConnection(con: JsonObject): JsonObject {
    const { type, auth, match, ...remainingConfig } = con;

    const result: JsonObject = {
      type: type as string,
      config: remainingConfig,
    };

    if (match !== undefined) {
      result.match = match;
    }

    if (Array.isArray(auth)) {
      result.auth = auth.map(a => {
        const { method, match: authMatch, ...rest } = a as JsonObject;
        const authResult: JsonObject = { method, config: rest };
        if (authMatch !== undefined) {
          authResult.match = authMatch;
        }
        return authResult;
      });
    }

    return result;
  }

  #validateConnection(connection: JsonObject): Connection {
    if (typeof connection.type !== 'string') {
      throw new Error(`Unrecognised connection type ${connection.type}`);
    }

    if (!isConnectionTypeKey(connection.type)) {
      throw new Error(`Unrecognised connection type ${connection.type}`);
    }

    getConnectionType(connection.type).schema.parse(connection);

    return connection as Connection;
  }

  #getConnectionsForPlugin(pluginId: string): Connection[] {
    // Filter connections and hide auth methods based on these conditions:
    // 1. Include Connections with no plugin matcher condition
    // 2. Include Connections with a plugin matcher condition for this plugin
    // 3. Include auth methods with no plugin matcher condition
    // 4. Remove auth methods with a plugin matcher condition for other plugins
    return this.connections
      .filter(({ match }) => {
        if (match) {
          return match.plugins.includes(pluginId);
        }

        return true;
      })
      .map(({ auth, ...rest }) => {
        const matchingAuth = auth.filter(({ match }) => {
          if (match) {
            return match.plugins.includes(pluginId);
          }

          return true;
        });
        return { auth: matchingAuth, ...rest };
      }, []);
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
