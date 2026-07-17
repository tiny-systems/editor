// The backend seam for the flow editor.
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
}

// The full client the host injects. Only `flow` is required today; `runs`,
// `statistics` and `project` join here as the traces/widgets panels land.
export interface EditorClient {
  flow: FlowClient
}
