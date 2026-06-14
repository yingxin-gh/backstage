---
'@backstage/ui': patch
---

Add `breadcrumbs` prop & breadcrumbs to `PluginHeader`. When passed `breadcrumbs`, `PluginHeader` renders a `nav` with breadcrumbs & visually hides the plugin title.

These breadcrumbs:

- Collapses middle segments if more than 5 segments
- Shows tooltip if text is truncated
