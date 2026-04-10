---
'@backstage/frontend-plugin-api': patch
---

Added a new `configSchema` option for `createExtension` and `createExtensionBlueprint` that accepts direct schema values from any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible library. The old `config.schema` option is now deprecated. See the [1.50 migration documentation](https://backstage.io/docs/frontend-system/architecture/migrations#150) for more information.
