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
import appPlugin from '@backstage/plugin-app';
import ReactDOM from 'react-dom/client';
import { Suspense, lazy } from 'react';

type AppPluginWithSimpleOverrides = {
  withOverrides(options: { extensions: unknown[] }): FrontendFeature;
};

// Collapse the deeply nested override types to avoid excessive instantiation.
const appPluginOverride = (
  appPlugin as unknown as AppPluginWithSimpleOverrides
).withOverrides({
  extensions: [
    appPlugin.getExtension('sign-in-page:app').override({
      disabled: true,
    }),
  ],
});

const BuiCss = lazy(() => import('./BuiCss'));

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
   * Allows for the binding of plugins' external route refs within the dev app.
   */
  bindRoutes?: CreateAppOptions['bindRoutes'];
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
  const { features, bindRoutes } = options;
  const devFeatures: CreateAppOptions['features'] = [
    appPluginOverride,
    ...features,
  ];
  const appOptions: CreateAppOptions = {
    bindRoutes,
    features: devFeatures,
  };
  const app = createApp(appOptions);
  const AppRoot = app.createRoot();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <Suspense fallback={null}>
      <BuiCss />
      {AppRoot}
    </Suspense>,
  );
}
