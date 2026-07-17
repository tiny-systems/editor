// The backend seam for the flow editor, plus the provide/inject wiring the
// workspace components use to reach it (in place of the platform's
// useNuxtApp().$grpc and useAuthStore()).
//
// The editor is deliberately proto-free: it never imports generated gRPC /
// connect-es code. Instead each host builds its own transport-bound client and
// injects it via `useFlowStore().setGrpcClient(client)`. This interface is the
// contract that client must satisfy — the exact surface the store calls.
//
//   - the platform webapp injects a connect-es client against the hosted API
//   - the tiny CLI injects one against its local FlowService (grpc-web)
//
// Requests use the platform's PascalCase field names. Responses are typed
// `any` on purpose: the store reads them defensively (`r.Foo ?? r.foo`) so it
// tolerates both connect-es camelCase getters and raw JSON, and so a host can
// back the client with anything shaped right — not only generated stubs.

export interface AcquireFlowLockRequest {
  FlowName: string
  ProjectName: string
}

export interface ReleaseFlowLockRequest {
  FlowName: string
  ProjectName: string
}

export interface RunActionRequest {
  NodeID: string
  ProjectName: string
  PortName: string
  Data: Uint8Array
}

export interface InspectNodeRequest {
  NodeID: string
  PortName: string
  FlowName: string
  ProjectName: string
  TraceID: string
  ScenarioName: string
  RunID: string
}

export interface RunExpressionRequest {
  Expression: string
  Data: string
  Schema: string
}

export interface GetFlowRequest {
  ProjectName: string
  FlowName: string
}

export interface GetFlowStreamRequest {
  FlowName: string
  ProjectName: string
  TraceID?: string
  ScenarioName?: string
  RunID?: string
}

export interface SaveMetaRequest {
  FlowName: string
  ProjectName: string
  Meta: unknown
}

export interface SaveFlowRequest {
  FlowName: string
  ProjectName: string
  Graph: Uint8Array
  Meta?: unknown
}

// The flow service surface. `getFlowStream` returns a server stream the store
// consumes with `for await`; everything else is a unary promise.
export interface FlowClient {
  acquireFlowLock(req: AcquireFlowLockRequest): Promise<any>
  releaseFlowLock(req: ReleaseFlowLockRequest): Promise<any>
  runAction(req: RunActionRequest): Promise<any>
  inspectNode(req: InspectNodeRequest): Promise<any>
  runExpression(req: RunExpressionRequest): Promise<any>
  getFlow(req: GetFlowRequest): Promise<any>
  getFlowStream(req: GetFlowStreamRequest): AsyncIterable<any>
  saveMeta(req: SaveMetaRequest): Promise<any>
  saveFlow(req: SaveFlowRequest): Promise<any>
  // Authoring surface used by the workspace panels (add-component palette,
  // node settings, switchers, revisions, transfer, undeploy). Requests are
  // loose objects (connect-es PartialMessage); responses stay `any`.
  getComponents(req: any): Promise<any>
  getFlowList(req: any): Promise<any>
  createFlow(req: any): Promise<any>
  export(req: any): Promise<any>
  getFlowRevisions(req: any): Promise<any>
  applyFlowRevision(req: any): Promise<any>
  listScenarios(req: any): Promise<any>
  deleteScenario(req: any): Promise<any>
  createScenarioFromTrace(req: any): Promise<any>
  transferNodes(req: any): Promise<any>
  undeployFlow(req: any): Promise<any>
  renameFlow(req: any): Promise<any>
}

// project slice — the project dashboard (its live stream) + configuration,
// flows/widgets management, and project lifecycle.
export interface ProjectClient {
  getProjectConfiguration(req: any): Promise<any>
  getConfiguration(req: any): Promise<any>
  // Live project stream — drives the dashboard's widgets, flow/node counts,
  // resources and status. Server-streaming.
  getStream(req: any): AsyncIterable<any>
  list(req: any): Promise<any>
  saveWidgets(req: any): Promise<any>
  createDashboardPage(req: any): Promise<any>
  deleteDashboardPage(req: any): Promise<any>
  delete(req: any): Promise<any>
  export(req: any): Promise<any>
  import(req: any): AsyncIterable<any>
  recover(req: any): AsyncIterable<any>
}

// workspaceActivity slice — the agent activity feed (WorkspaceActivityService).
// Server-streaming; the activity store consumes it.
export interface WorkspaceActivityClient {
  watch(req: any, opts?: { signal?: AbortSignal }): AsyncIterable<any>
}

// runs slice — the durable-run panel.
export interface RunsClient {
  listRuns(req: any): Promise<any>
  getRun(req: any): Promise<any>
  rerunRun(req: any): Promise<any>
  retryRun(req: any): Promise<any>
}

// statistics slice — traces + telemetry.
export interface StatisticsClient {
  getTraces(req: any): Promise<any>
  getTraceByID(req: any): Promise<any>
  getStream(req: any): AsyncIterable<any>
}

// The full client the host injects — the whole backend surface the editor
// touches, four service slices, no more. Each host builds these from its own
// transport (webapp → hosted API, tiny → local services) and injects them.
export interface EditorClient {
  flow: FlowClient
  project: ProjectClient
  runs: RunsClient
  statistics: StatisticsClient
  // Optional: the project shell's activity feed. Hosts that don't surface the
  // dashboard (e.g. the bare editor) can omit it.
  workspaceActivity?: WorkspaceActivityClient
}

// ── provide / inject ──────────────────────────────────────────────────────
//
// Workspace components read the client with useEditorClient() instead of the
// platform's useNuxtApp().$grpc. The host provides it once at the top of the
// editor tree.
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

export const EDITOR_CLIENT: InjectionKey<EditorClient> = Symbol('editorClient')

export function provideEditorClient(client: EditorClient): void {
  provide(EDITOR_CLIENT, client)
}

export function useEditorClient(): EditorClient {
  const client = inject(EDITOR_CLIENT, null)
  if (!client) {
    throw new Error('editor: no EditorClient provided — call provideEditorClient() in the host')
  }
  return client
}

// EditorContext carries the few host facts the editor needs that aren't the
// backend client — chiefly the workspace the platform scopes component lookups
// to. tiny has no workspaces, so it provides an empty context and the
// components fall back sensibly.
export interface EditorContext {
  workspace?: any
}

export const EDITOR_CONTEXT: InjectionKey<EditorContext> = Symbol('editorContext')

export function provideEditorContext(ctx: EditorContext): void {
  provide(EDITOR_CONTEXT, ctx)
}

export function useEditorContext(): EditorContext {
  return inject(EDITOR_CONTEXT, {})
}
