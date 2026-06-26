---
'@backstage/plugin-kubernetes-react': patch
---

Removed an unused `import` of `PodExecTerminal` from `config.d.ts`. The import referenced a file under `src/`, which is not part of the published package (only `dist` and `config.d.ts` are shipped), causing `error TS2307: Cannot find module './src/components/PodExecTerminal/PodExecTerminal'` during config schema extraction in consuming apps.
