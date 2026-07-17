// @tinysystems/editor — the shared flow editor, consumed by the platform
// webapp and the tiny CLI frontend. One editor, two hosts.
//
// Phase 2 (this slice): the dependency-free JSON-schema form editor. The
// graph canvas (TinyNode / TinyEdge / FlowPreview) and the data-layer
// store follow in later slices.

// The schema-driven form editor — used both inside the node inspector and
// standalone (project/cluster/module config, playground widgets).
export { default as JSONEditor } from './json-editor/JSONEditor.vue'

// Shared schema types, locale, and helpers the hosts reference alongside
// the editor (e.g. defaultLocale).
export * from './json-editor/common'
