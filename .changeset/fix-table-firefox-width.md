---
'@backstage/ui': patch
---

Fixed the Table component not filling its container width in Firefox. The `overflow` style is now applied to a wrapper element instead of the `<table>` element directly, which avoids a Firefox behavior where non-visible overflow on tables causes them to shrink-wrap to content size.
