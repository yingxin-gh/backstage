---
'@backstage/plugin-scaffolder': minor
---

Migrated the scaffolder plugin's new frontend system (NFS) definition to use the `SubPageBlueprint` pattern with tabbed navigation. The plugin now renders a parent page with sub-pages for Templates, Tasks, Actions, Template Editor, and Templating Extensions, matching the pattern used by the Settings plugin. Each sub-page handles its own internal routing, including parameterized routes for template wizard and task detail views. The legacy frontend system compatibility is preserved.
