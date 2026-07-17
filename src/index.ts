// @tinysystems/editor — the shared flow editor, consumed by the platform
// webapp and the tiny CLI frontend. One editor, two hosts.

// VueFlow canvas styles, bundled into the library's editor.css so hosts don't
// have to import them separately.
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

// The schema-driven form editor — used both inside the node inspector and
// standalone (project/cluster/module config, playground widgets).
export { default as JSONEditor } from './json-editor/JSONEditor.vue'

// Shared schema types, locale, and helpers the hosts reference alongside
// the editor (e.g. defaultLocale).
export * from './json-editor/common'

// The flow canvas — VueFlow-based node/edge rendering. FlowPreview renders a
// { nodes, edges } graph, read-only by default, with an `interactive` prop for
// pan + zoom. The store-backed, fully-editable FlowEditor follows in the next
// slice, behind the EditorClient seam.
export { default as FlowPreview } from './canvas/FlowPreview.vue'
export { default as TinyNode } from './canvas/TinyNode.vue'
export { default as TinyEdge } from './canvas/TinyEdge.vue'

// The flow store — the editor's data layer and the backend seam. A host builds
// its own transport-bound client and injects it with setGrpcClient(); the
// store never imports generated proto/connect code. EditorClient is the
// contract that injected client must satisfy.
export { useFlowStore } from './store/flow'
export type {
  EditorClient,
  FlowClient,
  AcquireFlowLockRequest,
  ReleaseFlowLockRequest,
  RunActionRequest,
  InspectNodeRequest,
  RunExpressionRequest,
  GetFlowRequest,
  GetFlowStreamRequest,
  SaveMetaRequest,
  SaveFlowRequest,
} from './store/client'
