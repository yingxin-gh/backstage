---
'@backstage/cli-common': patch
---

The `findOwnRootDir` utility now searches for the monorepo root by traversing up the directory tree looking for a `package.json` with `workspaces`, instead of assuming a fixed `../..` relative path.
