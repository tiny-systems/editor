// The project stream as a composable — the state and event handling behind
// every surface that shows a project's widgets live: the developer dashboard
// (ProjectWorkspace's Widgets tab) and the Agent page. One stream, one widget
// store, two homes.
//
// It owns the GetStream lifecycle (project config, cluster init, widget
// UPDATE/DELETE events) and the submit path (runAction on a node's control
// port). Host-specific behavior — GridStack wiring, edit-mode preservation,
// recovery modals — hangs off the hooks instead of living here.

import { ref, nextTick } from 'vue'
import { notify } from 'notiwind'
import type { EditorClient } from '../store/client'

export interface ProjectStreamHooks {
  // A widget arrived that wasn't on the board; called after it is in the DOM.
  onWidgetAdded?: (widget: any) => void
  // An existing widget is about to be replaced by fresh stream data. Mutate
  // `incoming` to preserve local state (unsaved schema edits, drag positions).
  beforeWidgetReplace?: (existing: any, incoming: any) => void
  // A widget was removed by a DELETE_WIDGET event (node deleted / unlabeled).
  onWidgetRemoved?: (id: string) => void
  // The TinyProject CR is gone from the cluster but the DB still has the
  // record — the host may offer recovery.
  onProjectMissing?: () => void
}

export interface SendSignalOptions {
  // Skip the "Sent" toast. Chat surfaces show their own in-thread pending
  // state, so a toast per message is noise there.
  silent?: boolean
}

export function useProjectStream(
  client: EditorClient,
  projectName: () => string,
  hooks: ProjectStreamHooks = {}
) {
  const loading = ref(false)
  const loadingStatus = ref('')
  const connected = ref(false)
  const error = ref<string | null>(null)

  const project = ref<any>(null)
  const server = ref<any>(null)
  const accessMap = ref<any>(null)
  const projectStat = ref<any>(null)

  const flows = ref<any[]>([])
  const widgets = ref<any[]>([])
  const dashboardPages = ref<any[]>([])
  const dashboardPage = ref<string | null>(null)

  let streamAbort: AbortController | null = null

  const isCanceled = (e: any) =>
    e.name === 'AbortError' ||
    (e.message && e.message.includes('[canceled]')) ||
    (e.message && e.message.includes('signal is aborted'))

  // Parse flow graph from bytes
  const parseFlowGraph = (flowItem: any) => {
    const flow = flowItem.Flow || flowItem.flow
    if (!flow) return null

    let graph = {}
    const graphBytes = flow.Graph || flow.graph
    if (graphBytes && graphBytes.length > 0) {
      try {
        const graphStr = new TextDecoder().decode(graphBytes)
        graph = JSON.parse(graphStr)
      } catch (e) {
        console.error('Failed to parse flow graph:', e)
      }
    }

    // Normalize property names (handle both PascalCase and lowercase)
    return {
      ID: flow.ID || flow.id,
      Name: flow.Name || flow.name,
      ResourceName: flow.ResourceName || flow.resourcename,
      Revision: flow.Revision || flow.revision,
      RevisionComment: flow.RevisionComment || flow.revisioncomment || '',
      Num: flow.Num || flow.num,
      graph
    }
  }

  const handleWidgetUpdate = async (widget: any) => {
    // Check if widget belongs to current page
    const widgetPages = widget.Pages || widget.pages || []
    if (dashboardPage.value && widgetPages.length > 0 && !widgetPages.includes(dashboardPage.value)) {
      return
    }

    // Parse schema and data from bytes
    let defaultSchema = {}
    let schema = {}
    let data = {}

    const defaultSchemaBytes = widget.DefaultSchema || widget.defaultschema
    if (defaultSchemaBytes && defaultSchemaBytes.length > 0) {
      try {
        defaultSchema = JSON.parse(new TextDecoder().decode(defaultSchemaBytes))
      } catch (e) {}
    }

    const schemaBytes = widget.Schema || widget.schema
    if (schemaBytes && schemaBytes.length > 0) {
      try {
        schema = JSON.parse(new TextDecoder().decode(schemaBytes))
      } catch (e) {}
    }

    const dataBytes = widget.Data || widget.data
    if (dataBytes && dataBytes.length > 0) {
      try {
        data = JSON.parse(new TextDecoder().decode(dataBytes))
      } catch (e) {}
    }

    const gridInfo = widget.Grid || widget.grid || {}

    const widgetData: any = {
      ID: widget.ID || widget.id,
      id: widget.ID || widget.id,
      title: widget.Title || '',
      Node: widget.Node || '',
      node: widget.Node || '',
      Port: widget.Port || '_control',
      port: widget.Port || '_control',
      pagesList: widgetPages,
      grid: {
        x: gridInfo.X ?? gridInfo.x ?? 0,
        y: gridInfo.Y ?? gridInfo.y ?? 0,
        w: (gridInfo.W || gridInfo.w) || 6, // Default width 6 columns (full width)
        h: (gridInfo.H || gridInfo.h) || 3 // Default height 3 rows
      },
      defaultSchema,
      DefaultSchema: defaultSchema,
      schema,
      Schema: schema,
      data,
      Data: data,
      _updateTime: Date.now() // Track update time for reactivity
    }

    const index = widgets.value.findIndex((w) => w.ID === widgetData.ID)
    if (index === -1) {
      widgets.value.push(widgetData)
      // Let the host wire the new DOM node (e.g. into GridStack).
      await nextTick()
      hooks.onWidgetAdded?.(widgetData)
    } else {
      const existing = widgets.value[index]
      hooks.beforeWidgetReplace?.(existing, widgetData)
      widgets.value[index] = widgetData
    }
  }

  const listenStream = async () => {
    const name = projectName()
    if (!name) return

    // Cancel any existing stream
    if (streamAbort) {
      streamAbort.abort()
    }
    streamAbort = new AbortController()

    const req: any = {
      ProjectName: name,
      PageName: dashboardPage.value || ''
    }

    try {
      for await (const response of client.project.getStream(req, { signal: streamAbort.signal })) {
        connected.value = true

        if (response.Type === 'LOADING') {
          loadingStatus.value = response.Message
          continue
        }

        if (response.Type === 'PROJECT_MISSING_IN_CLUSTER') {
          loading.value = false
          hooks.onProjectMissing?.()
          continue
        }

        if (response.Type === 'INIT_PROJECT_CONFIGURATION') {
          const config = response.Configuration
          if (config) {
            project.value = config.Project
            accessMap.value = config.Access
            server.value = config.Server
          }
          continue
        }

        if (response.Type === 'INIT_PROJECT') {
          loading.value = false
          const clusterInfo = response.ClusterInfo
          if (clusterInfo) {
            projectStat.value = clusterInfo.Stat

            // Set dashboard pages
            if (!dashboardPage.value) {
              if (clusterInfo.Pages && clusterInfo.Pages.length > 0) {
                dashboardPage.value = clusterInfo.Pages[0]!.Name
              } else {
                // No pages exist yet - set default page name so save can create it
                dashboardPage.value = 'Home'
              }
            }
            dashboardPages.value = clusterInfo.Pages || []

            // Parse flows
            const parsedFlows: any[] = []
            for (const flowItem of clusterInfo.Flows || []) {
              const parsed = parseFlowGraph(flowItem)
              if (parsed) {
                parsedFlows.push(parsed)
              }
            }
            flows.value = parsedFlows
          }
          continue
        }

        // Handle dashboard events (widget updates)
        for (const event of response.DashboardEvent || []) {
          if (event.Type === 'UPDATE_WIDGET') {
            const widget = event.Widget as any
            if (widget) {
              await handleWidgetUpdate(widget)
            }
          } else if (event.Type === 'DELETE_WIDGET') {
            // A dashboard node was deleted (or lost its label): drop its
            // widget live, so it can't linger.
            const wid = (event.Widget as any)?.ID || (event.Widget as any)?.id
            const idx = widgets.value.findIndex((w) => w.ID === wid)
            if (idx !== -1) {
              hooks.onWidgetRemoved?.(wid)
              widgets.value.splice(idx, 1)
            }
          }
        }
      }
    } catch (e: any) {
      // Ignore abort/cancel errors (from refresh or unmount)
      if (!isCanceled(e)) {
        error.value = e.message || 'Stream error'
        connected.value = false
        loading.value = false
        console.error('Project stream error:', e)
      }
    }
  }

  // (Re)start the stream from a clean slate.
  const start = () => {
    widgets.value = []
    flows.value = []
    loading.value = true
    error.value = null
    connected.value = false
    listenStream()
  }

  const stop = () => {
    if (streamAbort) {
      streamAbort.abort()
      streamAbort = null
    }
  }

  // Send a widget submission to its node's control port. Only action events
  // (button press / composer submit) are sent — keystrokes never leave the
  // browser.
  const sendSignal = async (event: any, nodeId: string, portName: string = '_control', opts: SendSignalOptions = {}) => {
    if (!event?.isAction) return
    if (!nodeId) return
    if (!projectName() || !project.value) return

    loading.value = true
    try {
      await client.flow.runAction({
        NodeID: nodeId,
        ProjectName: project.value.ResourceName || project.value.resourcename,
        PortName: portName,
        Data: new TextEncoder().encode(JSON.stringify(event.value))
      })
      // Signals are fire-and-forget: the flow runs on the cluster and this
      // call returns as soon as it is published. Without an acknowledgement
      // a submitted form looks identical to a dead button. Chat surfaces
      // opt out — their thread shows the pending state in place.
      if (!opts.silent) {
        notify(
          {
            group: 'success',
            title: 'Sent',
            text: 'The flow is running. Watch Errors above, or open the flow for its trace.'
          },
          4000
        )
      }
    } catch (e: any) {
      notify(
        {
          group: 'error',
          title: 'Error',
          text: e.message || 'Failed to run action'
        },
        99999
      )
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    loading,
    loadingStatus,
    connected,
    error,
    project,
    server,
    accessMap,
    projectStat,
    flows,
    widgets,
    dashboardPages,
    dashboardPage,
    // lifecycle
    start,
    stop,
    // submit path
    sendSignal
  }
}
