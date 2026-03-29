---
'@backstage/catalog-model': minor
---

Added a new catalog model layer system that allows plugins to declare and extend catalog entity kinds, annotations, labels, tags, and relations using JSON Schema. The new `createCatalogModelLayer` API provides a builder for composing model definitions, and a `compileCatalogModel` function validates and merges them into a unified model. Built-in entity kinds now include model layer definitions.
