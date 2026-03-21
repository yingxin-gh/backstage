---
'@backstage/ui': minor
---

**BREAKING**: Removed the `toolbarWrapper` element from `PluginHeader` and dropped `toolbarWrapper` from `PluginHeaderDefinition.classNames`. Toolbar layout styles now live on `toolbar` (`.bui-PluginHeaderToolbar`). Update custom CSS that targeted `.bui-PluginHeaderToolbarWrapper` to use `.bui-PluginHeaderToolbar` instead.

**Affected components:** PluginHeader

`PluginHeader` now establishes a neutral background provider (same rules as `Box` with `bg="neutral"`) so controls in the toolbar and tabs resolve `data-on-bg` correctly.
