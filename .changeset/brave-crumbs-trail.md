---
'@backstage/frontend-plugin-api': patch
'@backstage/plugin-app': patch
'@backstage/plugin-scaffolder': patch
---

Adds `useBreadcrumbs` hook, `BreadcrumbRegistration` component, and `BreadcrumbsRegistryProvider` for managing breadcrumb trails across the component tree for plugins using new frontend system. Completes wiring so that new frontend system plugin `Pages` and `SubPages` get automatic-population of `PluginHeader` breadcrumbs.

- The app plugin's `PageLayout` registers a root breadcrumb for each plugin page and passes the breadcrumb trail to `PluginHeader`
- A new `SubPageWrapperContext` bridges `PageBlueprint` and the app plugin — the app provides a `BreadcrumbRegistration` wrapper via the context, and `PageBlueprint` applies it to each sub-page route element.
- Plugin authors who need breadcrumbs for internal routes within a sub-page can wrap their route content with `BreadcrumbRegistration` manually.
  - `plugin-scaffolder` internal routes have been wrapped as an example
