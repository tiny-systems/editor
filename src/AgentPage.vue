<!--
  AgentPage — the place for USING an agent, as the flow editor is the place
  for building it. Mounted by a host at /app/<project>:

    <AgentPage :client="client" :project-name="p" />

  Quiet product chrome: the agent's name, a status chip, and the agent's
  widgets — chat renders as a real conversation (WidgetBody dispatches on the
  control schema's format). No canvas, no traces, no editing locks, no dev
  tabs.

  A dropped stream never leaves a dead white page: a thin "reconnecting…"
  bar appears and the page quietly retries until the stream is back.
-->
<template>
  <div class="min-h-full w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <!-- Reconnecting bar: only after we lost an established stream. -->
    <div v-if="reconnecting"
         class="sticky top-0 z-20 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/30 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-400">
      <span class="inline-block h-2.5 w-2.5 mr-1.5 align-middle animate-spin rounded-full border-2 border-amber-400 border-t-transparent"></span>
      reconnecting…
    </div>

    <header class="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex items-center justify-between gap-4">
      <h1 class="text-3xl font-thin truncate">{{ agentName }}</h1>
      <span :class="['shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', chip.cls]">
        <span :class="['h-1.5 w-1.5 rounded-full', chip.dot]"></span>
        {{ chip.label }}
      </span>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
      <section v-for="widget in widgets" :key="widget.id"
               class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <h2 v-if="widget.title"
            class="px-4 pt-3 pb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ widget.title }}</h2>
        <!-- Chat gets real estate; the wrapper carries the height because
             WidgetBody's root is h-full (it must fill grid cells on the
             dashboard) and a class merge would race it. -->
        <div :class="isChatWidget(widget) ? 'h-[32rem]' : ''">
          <WidgetBody
            :widget="widget"
            :locale="locale"
            @signal="(e) => onSignal(widget, e)"
          />
        </div>
      </section>

      <div v-if="!loading && !error && widgets.length === 0"
           class="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
        This agent has no widgets yet.
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        {{ loadingStatus || 'Connecting…' }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { provideEditorClient, provideEditorContext, type EditorClient } from './store/client'
import { useProjectStream } from './dashboard/useProjectStream'
import { isChatWidget } from './dashboard/widget-schema'
import WidgetBody from './dashboard/WidgetBody.vue'
import { defaultLocale } from './json-editor/common'

const props = defineProps<{
  client: EditorClient
  projectName: string
}>()

// Same seam as ProjectWorkspace: provide the backend client and an empty
// context so any lifted component below injects them instead of reaching for
// host globals.
provideEditorClient(props.client)
provideEditorContext({})

const locale = ref(defaultLocale)

const stream = useProjectStream(props.client, () => props.projectName)
const { loading, loadingStatus, connected, error, project, widgets } = stream

const agentName = computed(() => project.value?.Name || props.projectName)

// Status chip. "Needs setup" arrives with the setup zone; until then the chip
// reports liveness: Live once the stream is up, Connecting on first load,
// Offline when the stream is down and retrying.
const chip = computed(() => {
  if (connected.value) {
    return {
      label: 'Live',
      cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500'
    }
  }
  if (loading.value) {
    return {
      label: 'Connecting…',
      cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      dot: 'bg-gray-400'
    }
  }
  return {
    label: 'Offline',
    cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    dot: 'bg-red-500'
  }
})

// --- Quiet auto-reconnect -------------------------------------------------
// Once a stream has been up, losing it shows the thin bar and retries on a
// slow cadence until it is back. The stream also ends silently on server
// keepalive timeout; `connected` flipping false is the single signal.
const everConnected = ref(false)
const reconnecting = computed(() => everConnected.value && !connected.value)
let retryTimer: ReturnType<typeof setInterval> | null = null

watch(connected, (up) => {
  if (up) {
    everConnected.value = true
    if (retryTimer) {
      clearInterval(retryTimer)
      retryTimer = null
    }
    return
  }
  if (!retryTimer) {
    retryTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (!connected.value) stream.start()
    }, 4000)
  }
})

const onSignal = (widget: any, event: any) => {
  stream.sendSignal(event, widget.node, widget.port, { silent: !!event.chat })
}

watch(
  () => props.projectName,
  (_next, prev) => {
    if (prev === undefined) return
    stream.start()
  }
)

onMounted(() => {
  stream.start()
})

onUnmounted(() => {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  stream.stop()
})
</script>
