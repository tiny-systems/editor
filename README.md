# @tinysystems/editor

The Tiny Systems flow editor as a reusable Vue library — **one editor, two hosts**.

The same canvas, node/edge inspector, JSON-schema form editor, widgets and
traces render whether they run in the hosted platform webapp or the local
[`tiny`](https://github.com/tiny-systems/tiny) CLI. The only thing that
differs between them is the backend: an injected `EditorClient` (a set of
gRPC-web service clients) points the editor at the hosted API or at `tiny`'s
local `FlowService`. Same components → same experience, always.

## Layout

```
src/
  index.ts            public exports
  json-editor/        the schema-driven form editor (node inspector + config forms)
```

The graph canvas (VueFlow-based node/edge rendering), the flow store, and the
inspector/telemetry panels land in following slices, all behind the
`EditorClient` seam so neither host reaches for a specific backend.

## Consuming it

- **Library** (the platform webapp): `import { JSONEditor } from '@tinysystems/editor'`
  plus `@tinysystems/editor/style.css`.
- **Standalone SPA** (embedded by the `tiny` CLI): a bundled `dist/` built from
  the same source, served against `tiny`'s local endpoint.

## Develop

```
pnpm install
pnpm dev        # playground
pnpm build      # dist/editor.js + editor.css (+ types)
```

Peer dependency: Vue 3.4+.
