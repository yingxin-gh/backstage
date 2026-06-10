---
'@backstage/backend-dynamic-feature-service': patch
---

Fixed dynamic backend plugin loading to fall back to the main package export when an alpha `package.json` is present but does not provide a plugin entrypoint. Previously, plugins whose alpha export only exposed supplementary APIs (such as permissions) could fail to load even though the main export was valid. The loader now tries the alpha entry first and uses the main export when the alpha module does not export a `BackendFeature`, `BackendFeatureFactory`, or `dynamicPluginInstaller`.
