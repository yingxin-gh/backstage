---
'@backstage/frontend-plugin-api': patch
---

Added a new `configSchema` option for `createExtension` and `createExtensionBlueprint` that accepts direct schema values from any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible library with JSON Schema support, such as zod v4 or the `zod/v4` subpath from zod v3. The old `config.schema` option is now deprecated. Note that direct zod v3 schemas are not supported by the new `configSchema` option — use `import { z } from 'zod/v4'` from the zod v3 package, or upgrade to zod v4. See the [1.50 migration documentation](https://backstage.io/docs/frontend-system/architecture/migrations#150) for more information.
