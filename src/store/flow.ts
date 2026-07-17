import { defineStore } from 'pinia'
import { isEdge, isNode } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { Base64 } from 'js-base64'
import { Struct } from '@bufbuild/protobuf'
import type { EditorClient } from './client'

type FlowElement = Node | Edge

export interface FlowComponent {
  Info: string
  Description: string
}

export interface NodeRequest {
  Component: FlowComponent
  FlowID: string
  Node: FlowNode
}

export interface FlowNode {
  Graph: any
}

function clone(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    return obj
  }
}

function cleanElements(elements: FlowElement[]): FlowElement[] {
  const copy = clone(elements)
  Object.keys(copy).forEach((key) => {
    delete copy[key]['events']
    delete copy[key]['sourceNode']
    delete copy[key]['targetNode']
    delete copy[key]['isParent']
    delete copy[key]['dragging']
    delete copy[key]['initialized']
    delete copy[key]['selected']
    delete copy[key]['resizing']
    delete copy[key]['computedPosition']
    delete copy[key]['labelBgStyle']
    delete copy[key]['handleBounds']
    if (isEdge(copy[key])) {
      const edgeCopy = copy[key] as any
      delete edgeCopy['data']?.['error']
      delete edgeCopy['animated']
      delete edgeCopy['sourceX']
      delete edgeCopy['sourceY']
      delete edgeCopy['targetX']
      delete edgeCopy['targetY']
    } else if (isNode(copy[key])) {
      delete copy[key]['data']?.['stats']
      delete copy[key]['data']?.['emit']
      delete copy[key]['data']?.['blocked']
      delete copy[key]['data']?.['status']
      delete copy[key]['data']?.['error']
      delete copy[key]['data']?.['emitting']
      delete copy[key]['data']?.['disabled']
      delete copy[key]['data']?.['last_status_update']
      if (copy[key]['data']?.['handles']) {
        Object.keys(copy[key]['data']['handles']).forEach((keyh) => {
          delete copy[key]['data']['handles'][keyh]['style']
          delete copy[key]['data']['handles'][keyh]['class']
        })
      }
    }
  })
  return copy
}

function generateSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const useFlowStore = defineStore({
  id: 'flowStore',
  state() {
    return {
      loading: false,
      showRevisions: false,
      loadingAlt: false,
      ready: false,
      flowID: '',
      flowResourceName: '',
      projectResourceName: '',
      projectID: '',
      workspaceID: '',
      revision: 0,
      mutate: 0,
      elements: new Array<FlowElement>(),
      meta: {} as any,
      trace: '' as string | null,
      scenario: '' as string | null,
      run: '' as string | null,
      lastUpdate: null as any,
      animationCheckInterval: null as ReturnType<typeof setInterval> | null,
      streamCancel: null as (() => void) | null,
      // The backend seam: injected by the host via setGrpcClient(). The
      // platform webapp passes a connect-es client against the hosted API;
      // the tiny CLI passes one against its local FlowService. Same store,
      // different EditorClient — that's the whole "one editor, two hosts".
      grpcClient: null as EditorClient | null,
      // Stream connection state
      streamConnected: false as boolean,
      streamError: '' as string,
      // LLM streaming state - persists across component remounts
      llmStreaming: false as boolean,
      llmAbortController: null as AbortController | null,
      readOnly: true as boolean,
      // Flow lock state
      lockHolder: null as { Email: string; FirstName: string; LastName: string; SessionID: string; AcquiredAt: number } | null,
      lockAcquiring: false as boolean,
      lockError: '' as string
    }
  },
  getters: {
    //@ts-ignore
    selectedEdges: (state) => state.elements.filter((a: any) => (a.selected || false) && isEdge(a)),
    //@ts-ignore
    selectedEdge: (state) => state.selectedEdges.length > 0 ? state.selectedEdges[0] : undefined,
    //@ts-ignore
    selectedEdgeData: (state) => state.selectedEdge && state.selectedEdge.data ? state.selectedEdge.data : undefined,
    //@ts-ignore
    selectedEdgeTargetHandle: (state) => {
      //@ts-ignore
      if (!state.selectedEdge || !state.selectedEdge.targetNode || !state.selectedEdge.targetNode.data || !state.selectedEdge.targetNode.data.handles) {
        return undefined
      }
      //@ts-ignore
      return state.selectedEdge.targetNode.data.handles.find((a: any) => a.id === state.selectedEdge.targetHandle)
    },
    selectedConfiguration: (state): any => {
      //@ts-ignore
      const edgeData = state.selectedEdgeData
      if (edgeData && edgeData.configuration) {
        return edgeData.configuration
      }
      //@ts-ignore
      let handle = state.selectedEdgeTargetHandle
      if (handle == undefined) {
        //@ts-ignore
        handle = state.settingsHandle
      }
      if (handle == undefined) {
        return '{}'
      }
      return handle.configuration || '{}'
    },
    selectedSchema: (state): any => {
      //@ts-ignore
      const edgeData = state.selectedEdgeData
      if (edgeData && edgeData.schema) {
        return edgeData.schema
      }
      //@ts-ignore
      let handle = state.selectedEdgeTargetHandle
      if (handle == undefined) {
        //@ts-ignore
        handle = state.settingsHandle
      }
      if (handle == undefined) {
        return '{}'
      }
      return handle.schema || '{}'
    },
    selectedControl: (state) => {
      //@ts-ignore
      const handle = state.controlHandle
      if (handle == undefined) {
        return undefined
      }
      return handle.configuration || '{}'
    },
    // @ts-ignore
    selectedNodes: (state) => {
      //@ts-ignore
      return state.elements.filter((a: any) => (a.selected || false) && isNode(a))
    },
    selectedNode: (state) => {
      //@ts-ignore
      return state.selectedNodes.length > 0 ? state.selectedNodes[0] : undefined
    },
    selectedNodeId: (state) => {
      //@ts-ignore
      if (!state.selectedNode) {
        return ''
      }
      //@ts-ignore
      return state.selectedNode.id
    },
    selectedNodeLabel: (state) => {
      //@ts-ignore
      if (!state.selectedNode) {
        return ''
      }
      //@ts-ignore
      return state.selectedNode.data?.label || state.selectedNode.id
    },
    controlHandle: (state) => {
      //@ts-ignore
      if (!state.selectedNode || !state.selectedNode.data || !state.selectedNode.data.handles) {
        return undefined
      }
      //@ts-ignore
      return state.selectedNode.data.handles.find((a: any) => a.id == '_control')
    },
    controlHandleSchema: (state) => {
      //@ts-ignore
      if (!state.controlHandle) {
        return
      }
      //@ts-ignore
      return state.controlHandle.schema || '{}'
    },
    settingsHandle: (state) => {
      //@ts-ignore
      if (!state.selectedNode || !state.selectedNode.data || !state.selectedNode.data.handles) {
        return undefined
      }
      //@ts-ignore
      return state.selectedNode.data.handles.find((a: any) => a.id == '_settings')
    },
    settingsHandleSchema: (state) => {
      //@ts-ignore
      if (!state.settingsHandle) {
        return
      }
      //@ts-ignore
      return state.settingsHandle.schema || '{}'
    },
    //@ts-ignore
    selectedHandle: (state) => {
      //@ts-ignore
      if (!state.selectedNode || !state.selectedNode.data || !state.selectedNode.data.handles || state.selectedNode.data.handles.length === 0) {
        return undefined
      }
      //@ts-ignore
      let sel = state.selectedNode.selectedHandleId
      //@ts-ignore
      if (state.selectedNode.data.trace && state.selectedNode.data.trace.port && !sel) {
        //@ts-ignore
        sel = state.selectedNode.data.trace.port
      }
      //@ts-ignore
      // Filter out private handles (starting with _)
      const visibleHandles = state.selectedNode.data.handles.filter((h: any) => !h.id?.startsWith('_'))
      //@ts-ignore
      let selected = visibleHandles.find((a: any) => a.id === sel)
      if (!selected && visibleHandles.length > 0) {
        //@ts-ignore
        selected = visibleHandles[0]
      }
      return selected
    },
    //@ts-ignore
    selectedNodeHandles: (state) => {
      //@ts-ignore
      if (!state.selectedNode) {
        return []
      }
      //@ts-ignore
      if (state.selectedNode.data == undefined) {
        return []
      }
      //@ts-ignore
      if (state.selectedNode.data.handles == undefined) {
        return []
      }
      //@ts-ignore
      // Filter out private handles (starting with _)
      return state.selectedNode.data.handles.filter((h: any) => !h.id?.startsWith('_'))
    },
    // Collect all errors from edges connected to the selected node
    //@ts-ignore
    selectedNodeErrors: (state) => {
      //@ts-ignore
      if (!state.selectedNode) {
        return []
      }
      const nodeId = (state as any).selectedNode?.id
      const errors: Array<{edgeId: string, source: string, target: string, error: string}> = []

      // Find all edges where this node is source or target
      //@ts-ignore
      state.elements.filter((el: any) => isEdge(el)).forEach((edge: any) => {
        if (edge.source === nodeId || edge.target === nodeId) {
          // Check for error in data.error (validation errors) or data.trace.error (runtime errors)
          const error = edge.data?.error || edge.data?.trace?.error
          if (error) {
            errors.push({
              edgeId: edge.id,
              source: edge.sourceHandle || edge.source,
              target: edge.targetHandle || edge.target,
              error: error
            })
          }
        }
      })
      return errors
    }
  },
  actions: {
    setGrpcClient(client: EditorClient) {
      this.grpcClient = client
    },
    // LLM streaming actions
    startLlmStream(controller: AbortController) {
      this.llmStreaming = true
      this.llmAbortController = controller
    },
    stopLlmStream() {
      if (this.llmAbortController) {
        this.llmAbortController.abort()
        this.llmAbortController = null
      }
      this.llmStreaming = false
    },
    endLlmStream() {
      this.llmAbortController = null
      this.llmStreaming = false
    },
    async acquireLock() {
      if (!this.grpcClient || !this.flowResourceName || !this.projectResourceName) return
      this.lockAcquiring = true
      this.lockError = ''
      try {
        const response = await this.grpcClient.flow.acquireFlowLock({
          FlowName: this.flowResourceName,
          ProjectName: this.projectResourceName
        })
        const acquired = response.Acquired || (response as any).acquired
        const holder = response.LockHolder || (response as any).lockHolder || (response as any).lockholder
        if (acquired) {
          this.readOnly = false
          this.lockHolder = holder ? {
            Email: holder.Email || holder.email || '',
            FirstName: holder.FirstName || holder.firstName || holder.firstname || '',
            LastName: holder.LastName || holder.lastName || holder.lastname || '',
            SessionID: holder.SessionID || holder.sessionID || holder.sessionid || '',
            AcquiredAt: Number(holder.AcquiredAt || holder.acquiredAt || holder.acquiredat || 0)
          } : null
        } else {
          this.readOnly = true
          if (holder) {
            this.lockHolder = {
              Email: holder.Email || holder.email || '',
              FirstName: holder.FirstName || holder.firstName || holder.firstname || '',
              LastName: holder.LastName || holder.lastName || holder.lastname || '',
              SessionID: holder.SessionID || holder.sessionID || holder.sessionid || '',
              AcquiredAt: Number(holder.AcquiredAt || holder.acquiredAt || holder.acquiredat || 0)
            }
            this.lockError = `Locked by ${this.lockHolder.FirstName} ${this.lockHolder.LastName}`.trim() || `Locked by ${this.lockHolder.Email}`
          }
        }
      } catch (e: any) {
        this.lockError = e.message || 'Failed to acquire lock'
      } finally {
        this.lockAcquiring = false
      }
    },
    async releaseLock() {
      if (!this.grpcClient || !this.flowResourceName || !this.projectResourceName) return
      try {
        await this.grpcClient.flow.releaseFlowLock({
          FlowName: this.flowResourceName,
          ProjectName: this.projectResourceName
        })
      } catch (e: any) {
        console.error('Failed to release lock:', e)
      }
      this.readOnly = true
      this.lockHolder = null
      this.lockError = ''
    },
    async toggleLock() {
      if (this.readOnly) {
        await this.acquireLock()
      } else {
        await this.releaseLock()
      }
    },
    checkStaleAnimations() {
      const now = new Date().getTime() / 1000
      for (let i = 0; i < this.elements.length; i++) {
        //@ts-ignore
        if (this.elements[i].data && this.elements[i].data.stats) {
          //@ts-ignore
          const busyTimestamp = parseInt(this.elements[i].data.stats['tiny_edge_busy'] || 0)
          const timeSinceActivity = now - busyTimestamp
          //@ts-ignore
          this.elements[i].animated = timeSinceActivity < 7
        }
      }
    },
    startAnimationCheck() {
      if (this.animationCheckInterval === null) {
        this.animationCheckInterval = setInterval(() => {
          this.checkStaleAnimations()
        }, 1000)
      }
    },
    stopAnimationCheck() {
      if (this.animationCheckInterval !== null) {
        clearInterval(this.animationCheckInterval)
        this.animationCheckInterval = null
      }
    },
    select(id: string) {
      for (let i = 0; i < this.elements.length; i++) {
        if (this.elements[i]!.id !== id) {
          //@ts-ignore
          this.elements[i].selected = false
        } else {
          //@ts-ignore
          this.elements[i].selected = true
        }
      }
    },
    async runAction(node: string, port: string, data: any): Promise<any> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }
      this.loadingAlt = true
      try {
        const response = await this.grpcClient.flow.runAction({
          NodeID: node,
          ProjectName: this.projectResourceName,
          PortName: port,
          Data: new TextEncoder().encode(JSON.stringify(data))
        })
        return response
      } finally {
        this.loadingAlt = false
      }
    },
    async inspectNodePort(port: string, nodeID: string): Promise<any> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }
      const response = await this.grpcClient.flow.inspectNode({
        NodeID: nodeID,
        PortName: port,
        FlowName: this.flowResourceName,
        ProjectName: this.projectResourceName,
        TraceID: this.trace || '',
        ScenarioName: this.scenario || '',
        RunID: this.run || ''
      })
      return response.Data
    },
    async runExpression(expression: string, data: object, schema: object): Promise<any> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }
      const response = await this.grpcClient.flow.runExpression({
        Expression: expression,
        Data: JSON.stringify(data),
        Schema: JSON.stringify(schema)
      })
      return response
    },
    //@ts-ignore
    addElement(element: any) {
      if (element.graph === undefined) {
        return
      }
      // Check for duplicates - update existing element instead of adding duplicate
      const existingIndex = this.elements.findIndex((el: any) => el.id === element.graph.id)
      if (existingIndex !== -1) {
        const existing = this.elements[existingIndex] as any
        // Preserve selection state and stats, update data
        const existingSelected = existing.selected
        const existingStats = existing.data?.stats
        Object.assign(existing.data || {}, element.graph.data || {})
        if (existingStats || element.graph.data?.stats) {
          existing.data.stats = Object.assign({}, existingStats, element.graph.data?.stats)
        }
        if (element.graph.position) {
          existing.position = element.graph.position
        }
        // Preserve selection state
        existing.selected = existingSelected
        return
      }
      if (element.graph.data?.blocked || element.graph.data?.disabled) {
        element.graph.draggable = false
        if (isEdge(element.graph)) {
          element.graph.selectable = false
        }
      }
      // Ensure new elements from stream are not selected (selection is client-side only)
      element.graph.selected = false
      this.elements.push(element.graph)
    },
    //@ts-ignore
    applyStats(event: any) {
      for (let i = 0; i < this.elements.length; i++) {
        for (let key in event.graph) {
          if (this.elements[i]!.id !== key) {
            continue
          }
          //@ts-ignore
          if (!Object.hasOwn(event.graph, key)) {
            continue
          }
          const newStats = event.graph[key]
          this.elements[i]!.data.stats = Object.assign(this.elements[i]!.data.stats || {}, newStats)
        }
      }
      this.checkStaleAnimations()
    },
    //@ts-ignore
    update(element: any) {
      for (let i = 0; i < this.elements.length; i++) {
        if (this.elements[i]!.id == element.id) {
          this.elements[i] = element
        }
      }
    },
    //@ts-ignore
    updateElement(event: any) {
      for (let i = 0; i < this.elements.length; i++) {
        if (this.elements[i]!.id == event.id) {
          //@ts-ignore
          this.elements[i]!.data = {}
          Object.assign(this.elements[i]!.data, event.graph.data)
          return true
        }
      }
      return false
    },
    selectElement(id: string | null) {
      this.elements.map((a) => {
        if (id && a.id === id) {
          //@ts-ignore
          a.selected = true
        } else {
          //@ts-ignore
          a.selected = false
        }
      })
    },
    deleteElementSilent(id: string) {
      this.elements = this.elements.filter((a) => a.id !== id)
    },
    deleteElementHidden() {
      this.elements = this.elements.filter((a) => !a.hidden)
    },
    getElement(id: string) {
      return this.elements.find((a) => a.id == id)
    },
    async deleteSelected() {
      this.$patch((state) => {
        //@ts-ignore
        state.elements = this.elements.filter((a) => !a.selected)
      })
      await this.save()
    },
    async getStream(flowName: string, projectName: string): Promise<any> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }

      this.clean()
      this.loading = true
      this.streamConnected = false
      this.streamError = ''
      this.startAnimationCheck()

      const stream = this.grpcClient.flow.getFlowStream({
        FlowName: flowName,
        ProjectName: projectName,
        ...(this.trace ? { TraceID: this.trace } : {}),
        ...(this.scenario ? { ScenarioName: this.scenario } : {}),
        ...(this.run ? { RunID: this.run } : {})
      })

      let cancelled = false
      this.streamCancel = () => {
        cancelled = true
      }

      ;(async () => {
        try {
          for await (const response of stream) {
            if (cancelled) break
            // Mark as connected on first successful response
            if (!this.streamConnected) {
              this.streamConnected = true
              this.streamError = ''
            }
            this.processStreamResponse(response)
          }
          // Stream ended without error (server closed it)
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = 'Stream closed by server'
          }
        } catch (e: any) {
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = e.message || 'Stream connection lost'
            console.error('Stream error:', e)
          }
        }
      })()

      return {
        on: (event: string, callback: Function) => {},
        cancel: () => {
          this.streamCancel?.()
        }
      }
    },
    processStreamResponse(response: any) {
      if (!response) return

      // Set loading to false on any stream data (same as original)
      this.loading = false

      const events = response.Events || response.events || []
      events.forEach((event: any) => {
        this.processNodeEvent(event)
      })
    },
    processNodeEvent(event: any) {
      if (!event) return

      const type = event.Type || event.type || ''
      const id = event.ID || event.id || ''

      // Handle TICK events (heartbeat) - no graph data needed
      if (type === 'TICK') return

      // Parse graph data if it's bytes
      let graphData = event.Graph || event.graph

      if (graphData instanceof Uint8Array && graphData.length === 0) {
        graphData = null
      } else if (graphData instanceof Uint8Array) {
        try {
          graphData = JSON.parse(new TextDecoder().decode(graphData))
        } catch (e) {
          return
        }
      } else if (typeof graphData === 'string' && graphData.length > 0) {
        try {
          graphData = JSON.parse(Base64.decode(graphData))
        } catch (e) {
          try {
            graphData = JSON.parse(graphData)
          } catch (e2) {
            return
          }
        }
      }

      this.lastUpdate = { id, type, graph: graphData }

      switch (type) {
        case 'VERSION':
          this.revision = parseInt(id) || 0
          break
        case 'ADDED':
          this.addElement({ id, graph: graphData })
          this.deleteElementSilent('00000000000000000000')
          break
        case 'MODIFIED':
          this.updateElement({ id, graph: graphData })
          break
        case 'DELETED':
          this.deleteElementSilent(id)
          break
        case 'STATS':
          this.applyStats({ graph: graphData })
          break
        case 'LOCK':
          if (graphData) {
            const lockType = graphData.type || ''
            const holder = graphData.holder || null
            if (lockType === 'lock_released' || (!holder && lockType === 'lock_snapshot')) {
              this.lockHolder = null
              // If we thought we were editing, force read-only
              if (!this.readOnly) {
                this.readOnly = true
              }
            } else if (holder) {
              this.lockHolder = {
                Email: holder.Email || '',
                FirstName: holder.FirstName || '',
                LastName: holder.LastName || '',
                SessionID: holder.SessionID || '',
                AcquiredAt: Number(holder.AcquiredAt || 0)
              }
            }
          }
          break
        case 'LOG':
          break
        default:
          if (graphData) {
            this.addElement({ id, graph: graphData })
          }
      }
    },
    async load(projectName: string, flowName: string): Promise<any> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }

      this.loading = true

      try {
        const response = await this.grpcClient.flow.getFlow({
          ProjectName: projectName,
          FlowName: flowName
        })

        const flow = response.Flow
        const project = response.Project

        if (flow) {
          this.flowID = flow.ID
          this.flowResourceName = flow.ResourceName
          this.revision = flow.Revision || 0

          if (flow.Meta) {
            try {
              let metaData = flow.Meta
              if (metaData instanceof Uint8Array) {
                metaData = JSON.parse(new TextDecoder().decode(metaData))
              } else if (typeof metaData === 'string') {
                metaData = JSON.parse(Base64.decode(metaData))
              } else if (metaData.toJson) {
                // If it's a protobuf Struct, convert via toJson
                metaData = metaData.toJson()
              }
              this.meta = metaData
            } catch (e) {
              // Ignore meta parse errors
            }
          }
        }

        if (project) {
          this.projectID = project.ID
          this.projectResourceName = project.ResourceName
        }

        return { flow, project }
      } finally {
        this.loading = false
      }
    },
    clean() {
      // Release lock before cleanup (fire-and-forget)
      if (!this.readOnly && this.grpcClient && this.flowResourceName && this.projectResourceName) {
        this.grpcClient.flow.releaseFlowLock({
          FlowName: this.flowResourceName,
          ProjectName: this.projectResourceName
        }).catch(() => {})
      }
      this.elements = []
      this.stopAnimationCheck()
      if (this.streamCancel) {
        this.streamCancel()
        this.streamCancel = null
      }
      this.streamConnected = false
      this.streamError = ''
      this.readOnly = true
      this.lockHolder = null
      this.lockError = ''
      this.lockAcquiring = false
    },
    // Clear per-edge trace styling AND stale validation state before a
    // trace/scenario/run switch restarts the stream. The stream MERGES graph
    // data (Object.assign), so a now-valid edge whose event omits `error`
    // would keep its old red — a full reload starts clean, an in-app switch
    // didn't. Reset here so the switch matches a fresh load.
    resetEdgeState() {
      this.elements.forEach((el: any) => {
        if (el.style?.strokeWidth) delete el.style.strokeWidth
        if (!el.data) return
        delete el.data.trace
        if (el.source && el.target) {
          delete el.data.error
          delete el.data.warning
          delete el.data.errors
          // TinyEdge reds on `error || !valid`, so optimistically mark valid;
          // the restarted stream re-sets the real verdict a moment later.
          el.data.valid = true
        }
      })
    },
    // Apply a durable RUN - restart the stream so edges + node inspection use
    // the run's real per-port data from its self-describing ledger (no OTel
    // trace needed; works even when the trace is gone). Selecting a run is the
    // authoritative data source, so it clears any active trace/scenario.
    async applyRun(runId: string | null): Promise<void> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }
      if (this.streamCancel) {
        this.streamCancel()
        this.streamCancel = null
      }

      this.run = runId
      if (runId) {
        this.trace = null
        this.scenario = null
      }
      this.resetEdgeState()

      this.loading = true
      this.streamConnected = false
      this.streamError = ''
      this.startAnimationCheck()

      const stream = this.grpcClient.flow.getFlowStream({
        FlowName: this.flowResourceName,
        ProjectName: this.projectResourceName,
        ...(this.run ? { RunID: this.run } : {})
      })

      let cancelled = false
      this.streamCancel = () => { cancelled = true }

      ;(async () => {
        try {
          for await (const response of stream) {
            if (cancelled) break
            if (!this.streamConnected) {
              this.streamConnected = true
              this.streamError = ''
            }
            this.processStreamResponse(response)
          }
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = 'Stream closed by server'
          }
        } catch (e: any) {
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = e.message || 'Stream connection lost'
            console.error('Stream error:', e)
          }
        }
      })()
    },
    // Apply trace without full reload - just restart stream with new trace ID
    async applyTrace(traceId: string | null): Promise<void> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }

      // Cancel existing stream (but don't clear elements)
      if (this.streamCancel) {
        this.streamCancel()
        this.streamCancel = null
      }

      // Set new trace; a selected trace supersedes an active run filter
      this.trace = traceId
      if (traceId) this.run = null

      // Clear trace data + stale validation before applying new/cleared trace
      this.resetEdgeState()

      // If clearing trace (null), restart stream without trace filter
      // If setting trace, restart stream with trace filter
      // Either way, keep existing elements - stream will update them

      this.loading = true
      this.streamConnected = false
      this.streamError = ''
      this.startAnimationCheck()

      const stream = this.grpcClient.flow.getFlowStream({
        FlowName: this.flowResourceName,
        ProjectName: this.projectResourceName,
        ...(this.trace ? { TraceID: this.trace } : {}),
        ...(this.scenario ? { ScenarioName: this.scenario } : {}),
        ...(this.run ? { RunID: this.run } : {})
      })

      let cancelled = false
      this.streamCancel = () => {
        cancelled = true
      }

      ;(async () => {
        try {
          for await (const response of stream) {
            if (cancelled) break
            if (!this.streamConnected) {
              this.streamConnected = true
              this.streamError = ''
            }
            this.processStreamResponse(response)
          }
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = 'Stream closed by server'
          }
        } catch (e: any) {
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = e.message || 'Stream connection lost'
            console.error('Stream error:', e)
          }
        }
      })()
    },
    // Apply scenario - restart stream with scenario data for edge validation
    async applyScenario(scenarioName: string | null): Promise<void> {
      if (!this.grpcClient) {
        throw new Error('gRPC client not initialized')
      }

      if (this.streamCancel) {
        this.streamCancel()
        this.streamCancel = null
      }

      this.scenario = scenarioName

      // Selecting a scenario clears the active trace/run — scenarios show
      // sample data for validation, not execution timing
      if (scenarioName) {
        this.trace = null
        this.run = null
        this.resetEdgeState()
      }

      this.loading = true
      this.streamConnected = false
      this.streamError = ''
      this.startAnimationCheck()

      const stream = this.grpcClient.flow.getFlowStream({
        FlowName: this.flowResourceName,
        ProjectName: this.projectResourceName,
        ...(this.trace ? { TraceID: this.trace } : {}),
        ...(this.scenario ? { ScenarioName: this.scenario } : {}),
        ...(this.run ? { RunID: this.run } : {})
      })

      let cancelled = false
      this.streamCancel = () => {
        cancelled = true
      }

      ;(async () => {
        try {
          for await (const response of stream) {
            if (cancelled) break
            if (!this.streamConnected) {
              this.streamConnected = true
              this.streamError = ''
            }
            this.processStreamResponse(response)
          }
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = 'Stream closed by server'
          }
        } catch (e: any) {
          if (!cancelled) {
            this.streamConnected = false
            this.streamError = e.message || 'Stream connection lost'
            console.error('Stream error:', e)
          }
        }
      })()
    },
    setMeta(meta: Object) {
      this.meta = meta
    },
    async import(elements: any[]) {
      this.loading = true
      elements.forEach((el) => {
        el.hidden = true
        this.addElement({ id: el.id, graph: el })
      })
      try {
        await this.save()
      } catch (e) {
        console.error('Import error:', e)
        this.loading = false
        throw e
      }
      this.loading = false
    },
    export() {
      return cleanElements(this.elements)
    },
    async copySelected(): Promise<boolean> {
      const nodes = this.selectedNodes
      if (nodes.length === 0) {
        return false
      }
      const nodeIds = new Set(nodes.map((n: any) => n.id))
      const edges = this.elements.filter((el: any) => isEdge(el) && nodeIds.has(el.source) && nodeIds.has(el.target))
      const combined = [...nodes, ...edges]
      const cleaned = cleanElements(combined)
      const payload = JSON.stringify({ __tinysystems_clipboard: true, version: 1, elements: cleaned })
      await navigator.clipboard.writeText(payload)
      return true
    },
    async pasteFromClipboard(): Promise<boolean> {
      let text: string
      try {
        text = await navigator.clipboard.readText()
      } catch {
        return false
      }
      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch {
        return false
      }
      if (!parsed || parsed.__tinysystems_clipboard !== true || !Array.isArray(parsed.elements)) {
        return false
      }

      const existingIds = new Set(this.elements.map((el: any) => el.id))
      const oldToNew = new Map<string, string>()

      // Build ID map for nodes
      for (const el of parsed.elements) {
        if (!isNode(el)) continue
        const oldId = el.id as string
        const lastDash = oldId.lastIndexOf('-')
        const prefix = lastDash !== -1 ? oldId.substring(0, lastDash + 1) : oldId + '-'
        let newId = ''
        for (let attempt = 0; attempt < 100; attempt++) {
          newId = prefix + generateSuffix()
          if (!existingIds.has(newId) && !Array.from(oldToNew.values()).includes(newId)) {
            break
          }
        }
        oldToNew.set(oldId, newId)
      }

      const newElements: FlowElement[] = []

      // Clone nodes with new IDs and offset position
      for (const el of parsed.elements) {
        if (!isNode(el)) continue
        const newEl = clone(el)
        newEl.id = oldToNew.get(el.id)
        if (newEl.position) {
          newEl.position.x = (newEl.position.x || 0) + 50
          newEl.position.y = (newEl.position.y || 0) + 50
        }
        newElements.push(newEl)
      }

      // Clone edges with remapped source/target
      for (const el of parsed.elements) {
        if (!isEdge(el)) continue
        const newSource = oldToNew.get(el.source)
        const newTarget = oldToNew.get(el.target)
        if (!newSource || !newTarget) continue
        const newEl = clone(el)
        newEl.source = newSource
        newEl.target = newTarget
        newEl.id = `${newSource}_${el.sourceHandle}-${newTarget}_${el.targetHandle}`
        newElements.push(newEl)
      }

      if (newElements.length === 0) {
        return false
      }

      await this.import(newElements)
      return true
    },
    up() {
      this.$patch((state) => {
        state.mutate++
      })
    },
    async saveMeta(): Promise<void> {
      if (!this.grpcClient || !this.flowResourceName || !this.projectResourceName) {
        return
      }

      // Only save if we have valid viewport data (x/y/zoom can be 0, so check for undefined/null)
      if (this.meta?.x === undefined || this.meta?.y === undefined || this.meta?.zoom === undefined) {
        return
      }

      try {
        await this.grpcClient.flow.saveMeta({
          FlowName: this.flowResourceName,
          ProjectName: this.projectResourceName,
          Meta: Struct.fromJson(this.meta)
        })
      } catch (e) {
        // Silently ignore meta save errors
      }
    },
    async save(): Promise<void> {
      if (!this.grpcClient || !this.flowResourceName || !this.projectResourceName) {
        throw new Error('gRPC client or flow/project names not initialized')
      }

      const exportedElements = this.export()

      try {
        const request: any = {
          FlowName: this.flowResourceName,
          ProjectName: this.projectResourceName,
          Graph: new TextEncoder().encode(JSON.stringify({ elements: exportedElements }))
        }
        // Include meta if we have valid viewport data (x/y/zoom can be 0, so check for undefined/null)
        if (this.meta?.x !== undefined && this.meta?.y !== undefined && this.meta?.zoom !== undefined) {
          request.Meta = Struct.fromJson(this.meta)
        }
        await this.grpcClient.flow.saveFlow(request)
        this.loading = false
        this.loadingAlt = false
        this.deleteElementHidden()
      } catch (e: any) {
        this.loading = false
        this.loadingAlt = false
        throw e
      }
    },
    async rotate() {
      this.selectedNodes.forEach((el: any) => {
        //@ts-ignore
        el.data.spin++
        //@ts-ignore
        el.data.spin = el.data.spin % 4
        //@ts-ignore
        el.data.handles.forEach((h: any) => {
          //@ts-ignore
          h.rotated_position = (h.position + el.data.spin) % 4
        })
      })
      return this.save()
    }
  }
})

export { useFlowStore }
