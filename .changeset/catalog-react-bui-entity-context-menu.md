---
'@backstage/plugin-catalog-react': minor
---

**BREAKING ALPHA**: The `EntityContextMenuItemBlueprint` factory now renders BUI `MenuItem` instead of MUI `MenuItem`. Menu items close immediately when selected, including while asynchronous actions are pending, and links use the BUI external-link behavior. MUI icons passed via the `icon` parameter are automatically sized to fit, but other icon types may render differently.

We recommend checking that custom context-menu items look correct and switching to Remix Icon equivalents where appropriate.
