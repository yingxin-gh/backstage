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
import { ConnectionTypeKey, LookupConnectionType } from '../definitions';
import { AnyConnection, Connection } from './Connection';

class PluginConnectionsService implements ConnectionsService {
  private readonly logger: LoggerService;
  private readonly pluginId: string;
  private connections: AnyConnection[];

  constructor(pluginId: string, logger: LoggerService) {
    this.pluginId = pluginId;
    this.logger = logger;
    this.connections = [];
    this.connections.push({
      type: 'github',
      config: { host: 'github.com' },
      auth: [
        {
          method: 'app',
          config: {
            appId: '123',
            clientId: 'my-client',
            clientSecret: 'my-secret',
            privateKey: 'priv-key',
          },
        },
      ],
    });
    this.connections.push({
      type: 'github',
      config: { host: 'spotify.github.com' },
      auth: [{ method: 'token', config: { token: 'a-token' } }],
    });
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

  async registerConnection(): Promise<void> {
    return;
  }
}

export class DefaultConnectionsService {
  private readonly logger: LoggerService;

  private constructor(logger: LoggerService) {
    this.logger = logger;
  }

  static create(options: {
    logger: LoggerService;
    config?: RootConfigService;
  }): DefaultConnectionsService {
    return new DefaultConnectionsService(options.logger);
  }

  forPlugin(
    pluginId: string,
    options?: {
      logger: LoggerService;
    },
  ): ConnectionsService {
    const logger = options?.logger ?? this.logger;
    return new PluginConnectionsService(pluginId, logger);
  }
}
