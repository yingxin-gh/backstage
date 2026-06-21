import {
  ApiBlueprint,
  createFrontendModule,
  discoveryApiRef,
  errorApiRef,
  fetchApiRef,
  identityApiRef,
  storageApiRef,
} from '@backstage/frontend-plugin-api';
import { UserSettingsStorage } from '@backstage/plugin-user-settings';
import { signalApiRef } from '@backstage/plugin-signals-react';

export const userSettingsStorageModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    ApiBlueprint.make({
      name: 'user-settings-storage',
      params: defineParams =>
        defineParams({
          api: storageApiRef,
          deps: {
            discoveryApi: discoveryApiRef,
            fetchApi: fetchApiRef,
            errorApi: errorApiRef,
            identityApi: identityApiRef,
            signalApi: signalApiRef,
          },
          factory: deps => UserSettingsStorage.create(deps),
        }),
    }),
  ],
});
