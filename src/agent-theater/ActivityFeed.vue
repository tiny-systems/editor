<!--
  Agent activity feed. Events are grouped by session_id so each MCP-
  client conversation reads as its own block, separated by a small
  eyebrow header. Within a group, rows fade in from below and tool
  calls can be expanded to inspect the JSON args the model sent.

  Visual language matches the rest of the dashboard: gray scale + a
  single indigo accent for in-flight work, rose for failures. Tool
  names stay monospaced (they're identifiers); descriptions, times,
  and headers use the default sans so the panel reads like a normal
  log rather than a terminal output buffer.
-->
<template>
  <div class="space-y-5 text-sm">
    <template v-for="(group, gIdx) in groups" :key="group.sessionId || `nosession-${gIdx}`">
      <!-- Eyebrow header per session/group -->
      <div class="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
        <span class="font-medium">{{ group.label }}</span>
        <span class="flex-1 h-px bg-gray-200/70 dark:bg-gray-800/70" />
        <span class="font-normal normal-case text-gray-400 dark:text-gray-500">
          {{ group.events.length }} {{ group.events.length === 1 ? 'event' : 'events' }}
        </span>
      </div>

      <TransitionGroup name="feed" tag="div" class="space-y-1.5">
        <div
          v-for="entry in group.entries"
          :key="entry.id"
          class="flex flex-col"
        >
          <div class="flex items-baseline gap-3">
            <!-- Fixed-width time column so the indicator column stays
                 aligned across rows; tabular-nums keeps single digits
                 from jittering. -->
            <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 w-16 shrink-0 text-right tabular-nums">
              {{ entry.time }}
            </span>

            <!-- Indicator: indigo for in-flight, gray for completed,
                 rose for failed. The pulse on in-flight is the only
                 motion in the feed so it stays noticeable. -->
            <span class="shrink-0 self-center inline-flex h-2 w-2 rounded-full" :class="entry.indicatorClass">
              <span
                v-if="entry.indicatorClass === indigoIndicator"
                class="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-60"
              />
            </span>

            <!-- Tool/event name in mono (it's an identifier), then
                 a short descriptor in sans. -->
            <div class="flex-1 min-w-0">
              <span class="font-mono text-xs text-gray-700 dark:text-gray-200">{{ entry.tool }}</span>
              <span v-if="entry.message" class="text-xs text-gray-500 dark:text-gray-400 ml-2">{{ entry.message }}</span>
            </div>

            <button
              v-if="entry.argsJSON"
              type="button"
              class="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              @click="toggleExpand(entry.id)"
            >
              {{ expanded.has(entry.id) ? 'hide' : 'args' }}
            </button>
          </div>

          <pre
            v-if="entry.argsJSON && expanded.has(entry.id)"
            class="mt-1.5 ml-20 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono"
          >{{ entry.argsPretty }}</pre>
        </div>
      </TransitionGroup>
    </template>

    <p
      v-if="groups.length === 0"
      class="text-sm text-gray-400 dark:text-gray-500"
    >
      Waiting for the agent to do something…
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useActivityStore } from '../store/activity'

const store = useActivityStore()

interface Entry {
  id: string
  time: string
  tool: string
  message: string
  indicatorClass: string
  argsJSON: string
  argsPretty: string
}

interface Group {
  sessionId: string
  label: string
  events: any[]
  entries: Entry[]
}

// Indicator palettes — exported as constants so the template can
// compare `entry.indicatorClass === indigoIndicator` for the pulse
// overlay without leaking a magic string.
const indigoIndicator = 'bg-indigo-500 relative'
const grayIndicator = 'bg-gray-300 dark:bg-gray-600'
const roseIndicator = 'bg-rose-500'

const expanded = ref<Set<string>>(new Set())
function toggleExpand(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
  // Trigger reactivity — Set mutations aren't reactive by default.
  expanded.value = new Set(expanded.value)
}

// formatEvent normalises every workspace activity event into the
// same {tool, message, indicator} shape so the feed reads uniformly
// regardless of which event kind landed. Tool/event name is the
// monospace identifier; message is a short, sans-serif descriptor.
function formatEvent(evt: any, idx: number): Entry {
  const time = (() => {
    if (!evt.at) return ''
    const d = new Date(evt.at)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })()

  const baseId = `${idx}-${evt.at ?? ''}-${evt.kind ?? ''}`
  const payload: any = evt.payload
  const argsJSON = evt.kind === 'tool.call.started' ? (payload?.value?.argsJson ?? '') : ''
  const argsPretty = prettifyArgs(argsJSON)

  switch (evt.kind) {
    case 'flow.created':
      return {
        id: baseId, time,
        tool: 'flow.created',
        message: payload?.value?.title ?? payload?.value?.flowName ?? 'untitled',
        indicatorClass: grayIndicator,
        argsJSON: '', argsPretty: '',
      }
    case 'flow.deleted':
      return {
        id: baseId, time,
        tool: 'flow.deleted',
        message: payload?.value?.flowName ?? '?',
        indicatorClass: roseIndicator,
        argsJSON: '', argsPretty: '',
      }
    case 'module.installed':
      return {
        id: baseId, time,
        tool: 'module.installed',
        message: payload?.value?.moduleName ?? '?',
        indicatorClass: grayIndicator,
        argsJSON: '', argsPretty: '',
      }
    case 'module.uninstalled':
      return {
        id: baseId, time,
        tool: 'module.uninstalled',
        message: payload?.value?.moduleName ?? '?',
        indicatorClass: grayIndicator,
        argsJSON: '', argsPretty: '',
      }
    case 'project.created':
      return {
        id: baseId, time,
        tool: 'project.created',
        message: payload?.value?.displayName ?? payload?.value?.resourceName ?? '?',
        indicatorClass: grayIndicator,
        argsJSON: '', argsPretty: '',
      }
    case 'tool.call.started':
      return {
        id: baseId, time,
        tool: payload?.value?.tool ?? 'tool',
        message: 'running',
        indicatorClass: indigoIndicator,
        argsJSON, argsPretty,
      }
    case 'tool.call.ended': {
      const success = !!payload?.value?.success
      const errMsg = payload?.value?.error ?? ''
      return {
        id: baseId, time,
        tool: payload?.value?.tool ?? 'tool',
        message: success ? 'done' : (errMsg ? `failed: ${errMsg}` : 'failed'),
        indicatorClass: success ? grayIndicator : roseIndicator,
        argsJSON: '', argsPretty: '',
      }
    }
  }
  return {
    id: baseId, time,
    tool: evt.kind ?? 'event',
    message: '',
    indicatorClass: grayIndicator,
    argsJSON: '', argsPretty: '',
  }
}

// prettifyArgs tries to parse + re-stringify the args JSON for
// readable display. Falls back to the raw string if parse fails
// (interceptor caps at 16KB with a truncation marker that breaks
// strict JSON).
function prettifyArgs(s: string): string {
  if (!s) return ''
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

// Format a session id for the group header. Empty id (no MCP
// session — dashboard-driven events) gets a generic "Dashboard"
// label. Otherwise show a short prefix + the dev key name (when
// available) so users can tell whose session this is at a glance,
// e.g. "Session 7a3f · alice-laptop · 16:48".
function sessionLabel(sessionId: string, firstEvent: any): string {
  if (!sessionId) return 'Dashboard activity'
  const short = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId
  const keyName = firstEvent.actorKeyName?.trim() || ''
  const at = firstEvent.at ? new Date(firstEvent.at) : null
  const time = at && !isNaN(at.getTime())
    ? at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : ''
  const parts = [`Session ${short}`]
  if (keyName) parts.push(keyName)
  if (time) parts.push(time)
  return parts.join(' · ')
}

const groups = computed<Group[]>(() => {
  const out: Group[] = []
  let current: Group | null = null
  store.recentEvents.forEach((evt, idx) => {
    const sid = evt.sessionId ?? ''
    if (!current || current.sessionId !== sid) {
      current = {
        sessionId: sid,
        label: sessionLabel(sid, evt),
        events: [],
        entries: [],
      }
      out.push(current)
    }
    current.events.push(evt)
    current.entries.push(formatEvent(evt, idx))
  })
  return out
})
</script>

<style scoped>
.feed-enter-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.feed-leave-active {
  transition: opacity 200ms ease;
}
.feed-leave-to {
  opacity: 0;
}
</style>
