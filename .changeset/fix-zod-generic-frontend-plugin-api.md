---
'@backstage/frontend-plugin-api': minor
---

**BREAKING**: Removed the deprecated `createSchemaFromZod` helper. Use the `configSchema` option with Standard Schema values instead, for example `configSchema: { title: z.string() }` using zod v3.25+ or v4.
