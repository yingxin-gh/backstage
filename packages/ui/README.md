# @backstage/ui

Backstage UI is a component library for Backstage.

## Installation

Install the package via Yarn:

```sh
cd <package-dir> # if within a monorepo
yarn add @backstage/ui
```

## Documentation

- [Backstage UI Documentation](https://ui.backstage.io)
- [Backstage Readme](https://github.com/backstage/backstage/blob/master/README.md)
- [Backstage Documentation](https://backstage.io/docs)

## Table Cell Requirement

When using the `Table` component, every cell rendered via `ColumnConfig.cell` (or
inside a custom `RowRenderFn`) **must** return a cell component as the top-level
element. The available cell components are:

- **`CellText`** — displays a title with optional description and icon.
- **`CellProfile`** — displays an avatar with a name and optional description.
- **`Cell`** — a generic wrapper for fully custom cell content.

Returning bare text, React fragments, or other elements without wrapping them in
one of these cell components will break the table layout.

```tsx
// ✅ Correct — CellText is the top-level element
cell: item => <CellText title={item.name} />;

// ✅ Correct — Cell wraps custom content
cell: item => (
  <Cell>
    <MyCustomContent value={item.name} />
  </Cell>
);

// ❌ Wrong — bare text without a cell wrapper
cell: item => <span>{item.name}</span>;
```

## Writing Changesets for Components

When creating changesets for component-specific changes, add component metadata to help maintain documentation:

```markdown
---
'@backstage/ui': patch
---

Fixed size prop handling for Avatar component.

Affected components: Avatar
```

**Guidelines:**

- **Component names**: Use PascalCase as they appear in imports (Avatar, ButtonIcon, SearchField)
- **Multiple components**: `Affected components: Button, ButtonLink, ButtonIcon`
- **General changes**: Omit the metadata line (build changes, package-level updates)
- **Placement**: The line can appear anywhere in the description

The changelog sync tool will parse these tags and update the documentation site automatically.
