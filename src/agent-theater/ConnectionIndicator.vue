<!--
  Small dot + label showing whether the dashboard is subscribed
  to the workspace activity bus.

  IMPORTANT: this does NOT reflect whether the MCP client (Claude
  Desktop / Cursor / Claude Code) is currently connected to
  mcp.tinysystems.io. The dashboard has no signal for that.
  What it actually tracks is the browser's gRPC Watch stream to
  WorkspaceActivityService.

  When tool.call.* events land in the activity bus we know SOMETHING
  is using the MCP server, so we surface a separate "Last tool call"
  hint derived from `lastToolCallAt`. That's the closest honest
  approximation of "MCP active right now".
-->
<template>
  <div class="flex items-center gap-3 text-sm">
    <div class="flex items-center gap-2">
      <span class="relative inline-flex h-2.5 w-2.5">
        <span
          v-if="isActive"
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"
        />
        <span
          class="relative inline-flex h-2.5 w-2.5 rounded-full"
          :class="dotColor"
        />
      </span>
      <span class="text-gray-600 dark:text-gray-300">{{ label }}</span>
    </div>
    <span
      v-if="lastCallLabel"
      class="text-xs text-gray-400 dark:text-gray-500"
      :title="lastToolCallTooltip"
    >
      Last tool call {{ lastCallLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useActivityStore } from '~/stores/activity'

const store = useActivityStore()

const ACTIVE_WINDOW_MS = 60_000

// Tick every second so the relative-time label decays naturally
// without waiting for the next event to arrive.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const isActive = computed(() => {
  const last = store.lastToolCallAt
  if (!last) return false
  return now.value - last < ACTIVE_WINDOW_MS
})

// label describes the dashboard's own subscription state — NOT
// the MCP client's connection. Wording is deliberately honest
// ("Live" not "MCP connected") so users don't think the dot
// proves their Claude is talking to the server.
const label = computed(() => {
  switch (store.connection) {
    case 'off':
      return 'Offline'
    case 'connecting':
      return 'Connecting…'
    case 'reconnecting':
      return 'Reconnecting…'
    case 'live':
      return 'Live'
  }
  return ''
})

// Single accent across the theater: indigo when subscribed, brighter
// indigo (with the animate-ping ripple in the template) while a tool
// call is in flight. Amber only while reconnecting; gray when off.
// Drop the emerald "live but idle" colour — it clashed with the
// indigo-only palette the rest of the dashboard uses.
const dotColor = computed(() => {
  if (isActive.value) return 'bg-indigo-500'
  switch (store.connection) {
    case 'live':
      return 'bg-indigo-400'
    case 'connecting':
    case 'reconnecting':
      return 'bg-amber-500'
    default:
      return 'bg-gray-400'
  }
})

// Relative-time formatter for the "Last tool call" hint. Closest
// honest signal we have for "MCP server has been reached recently".
const lastCallLabel = computed(() => {
  const last = store.lastToolCallAt
  if (!last) return ''
  const diff = now.value - last
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
})

const lastToolCallTooltip = computed(() => {
  const last = store.lastToolCallAt
  if (!last) return ''
  return new Date(last).toLocaleString()
})
</script>
