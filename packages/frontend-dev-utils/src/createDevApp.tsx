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

import {
  FrontendFeature,
  FrontendFeatureLoader,
} from '@backstage/frontend-plugin-api';
import { createApp, CreateAppOptions } from '@backstage/frontend-defaults';
import ReactDOM from 'react-dom/client';

/**
 * Options for {@link createDevApp}.
 *
 * @public
 */
export interface CreateDevAppOptions {
  /**
   * The list of features to load in the dev app.
   */
  features: (FrontendFeature | FrontendFeatureLoader)[];

  /**
   * Additional options to pass through to `createApp`.
   */
  createAppOptions?: Omit<CreateAppOptions, 'features'>;
}

/**
 * Creates and renders a minimal development app for the new frontend system.
 *
 * @example
 * ```tsx
 * // dev/index.ts
 * import { createDevApp } from '@backstage/frontend-dev-utils';
 * import myPlugin from '../src';
 *
 * createDevApp({ features: [myPlugin] });
 * ```
 *
 * @public
 */
export function createDevApp(options: CreateDevAppOptions): void {
  const app = createApp({
    ...options.createAppOptions,
    features: options.features,
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    app.createRoot(),
  );
}
