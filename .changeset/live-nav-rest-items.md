---
'@backstage/plugin-app': patch
'@backstage/plugin-app-react': patch
---

`NavContentBlueprint` nav item collections now keep previously collected `rest()` results in sync when additional items are taken later in the same render, making it easier to place items across multiple sidebar sections.
