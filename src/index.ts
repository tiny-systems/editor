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

// FlowEditor is the real platform canvas — VueFlow with editing (connect,
// drag, auto-layout, minimap, lock toggle, add-node). It emits addNode /
// configureEdge / deleteNode / deleteEdge up to a workspace that owns the
// panels. Hosts mount FlowWorkspace (below), not this directly.
export { default as FlowEditor } from './flow/FlowEditor.vue'

// The flow store — the editor's data layer and the backend seam. A host builds
// its own transport-bound client and injects it with setGrpcClient(); the
// store never imports generated proto/connect code. EditorClient is the
// contract that injected client must satisfy.
export { useFlowStore } from './store/flow'

// The backend seam: hosts build transport-bound clients and inject them with
// provideEditorClient(); components read them with useEditorClient(). The
// editor never imports generated proto/connect code — EditorClient is the
// structural contract those clients satisfy. provideEditorContext supplies the
// few non-backend host facts (the workspace).
export {
  provideEditorClient,
  useEditorClient,
  provideEditorContext,
  useEditorContext,
  EDITOR_CLIENT,
  EDITOR_CONTEXT,
} from './store/client'
export type {
  EditorClient,
  FlowClient,
  ProjectClient,
  RunsClient,
  StatisticsClient,
  EditorContext,
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

// The full component tree lifted from the platform — the real inspector,
// palette, switchers, runs, telemetry, traces and modals. FlowWorkspace (next)
// composes these into the mountable editor; they're exported individually too
// so a host can compose its own arrangement.
export * from './flow'
