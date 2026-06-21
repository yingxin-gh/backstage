import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { userSettingsStorageModule } from './modules/userSettingsStorage';

export default createApp({
  features: [catalogPlugin, navModule, userSettingsStorageModule],
});
