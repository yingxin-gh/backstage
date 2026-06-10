---
'@backstage/ui': patch
---

Added re-exports of `Selection`, `SortDirection`, `Key`, `Separator`, `Focusable`, `ListBox`, `ListBoxItem`, `ListLayout`, and `Virtualizer` from `react-aria-components`. Consumers can now import these directly from `@backstage/ui` instead of depending on `react-aria-components`, avoiding version mismatches.
