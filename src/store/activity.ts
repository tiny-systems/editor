// Activity store — consumes WorkspaceActivityService.Watch and exposes the
// events as reactive state for the agent-theater components. Lifted from the
// platform; backend-agnostic like the flow store: the host injects the client
// via setGrpcClient(). Keeps the last 100 events.

import { defineStore } from 'pinia'
import type { EditorClient } from './client'
import { useAgentSounds, type AgentSoundKind } from '../support/useAgentSounds'

const MAX_EVENTS = 100

// eventToSound maps an activity event kind to an audio cue.
function eventToSound(evt: any): AgentSoundKind | null {
  switch (evt?.kind) {
    case 'tool.call.started':
      return 'tool-start'
    case 'tool.call.ended':
      return (evt.payload as any)?.value?.success ? 'tool-success' : 'tool-fail'
    case 'flow.created':
      return 'flow-created'
    case 'flow.deleted':
      return 'flow-deleted'
    case 'module.installed':
      return 'module-installed'
    case 'module.uninstalled':
      return 'module-uninstalled'
  }
  return null
}

export type ConnectionState = 'off' | 'connecting' | 'live' | 'reconnecting'

export const useActivityStore = defineStore('activity', {
  state: () => ({
    events: [] as any[],
    connection: 'off' as ConnectionState,
    currentProject: '' as string,
    lastToolCallAt: null as number | null,
    // The backend seam — injected by the host (same pattern as the flow store).
    grpcClient: null as EditorClient | null,
    _abort: null as AbortController | null,
  }),

  getters: {
    isLive(state): boolean {
      return state.connection === 'live'
    },
    recentEvents(state): any[] {
      return state.events.slice(-20)
    },
  },

  actions: {
    setGrpcClient(client: EditorClient) {
      this.grpcClient = client
    },

    async start(project = '') {
      if (this.connection === 'live' && this.currentProject === project) {
        return
      }
      this.stop()

      const activity = this.grpcClient?.workspaceActivity
      if (!activity) {
        // Host doesn't provide the activity stream (or not ready yet).
        return
      }

      const controller = new AbortController()
      this._abort = controller
      this.currentProject = project
      this.connection = 'connecting'
      this.events = []
      this.lastToolCallAt = null

      const req = { projectName: project }

      ;(async () => {
        try {
          const stream = activity.watch(req, { signal: controller.signal })
          this.connection = 'live'
          for await (const evt of stream as AsyncIterable<any>) {
            if (controller.signal.aborted) break
            this._pushEvent(evt)
          }
          if (!controller.signal.aborted) {
            this.connection = 'off'
          }
        } catch (err: any) {
          if (controller.signal.aborted) return
          this.connection = 'reconnecting'
          console.warn('[activity] stream error:', err?.message ?? err)
        }
      })()
    },

    stop() {
      this._abort?.abort()
      this._abort = null
      this.connection = 'off'
    },

    _pushEvent(evt: any) {
      const id = (evt as any).id
      if (id && this.events.some((e) => (e as any).id === id)) {
        return
      }
      this.events.push(evt)
      if (this.events.length > MAX_EVENTS) {
        this.events.splice(0, this.events.length - MAX_EVENTS)
      }
      if (evt.kind?.startsWith('tool.call.')) {
        this.lastToolCallAt = Date.now()
      }
      const kind = eventToSound(evt)
      if (kind) {
        useAgentSounds().play(kind)
      }
    },
  },
})
