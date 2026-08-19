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

    <!-- An agent that streams perfectly but has never run looks identical to
         a working one. Say so, and point at the tab that usually fixes it. -->
    <div v-if="attention"
         class="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
      <div class="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between gap-4">
        <span>{{ attention.text }}</span>
        <button v-if="attention.action" type="button" @click="changePage(attention.action.name)"
                class="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
          Open {{ attention.action.title || attention.action.name }}
        </button>
      </div>
    </div>

    <header class="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex items-center justify-between gap-4">
      <h1 class="text-3xl font-thin truncate">{{ agentName }}</h1>
      <span :class="['shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', chip.cls]">
        <span :class="['h-1.5 w-1.5 rounded-full', chip.dot]"></span>
        {{ chip.label }}
      </span>
    </header>

    <nav v-if="pages.length > 1" class="max-w-3xl mx-auto px-4 sm:px-6 pb-4 flex gap-2">
      <button v-for="p in pages" :key="p.name" type="button" @click="changePage(p.name)"
              :class="['rounded-full px-4 py-1.5 text-sm transition-colors',
                       dashboardPage === p.name
                         ? 'bg-indigo-500 text-white'
                         : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700']">
        {{ p.title }}
      </button>
    </nav>

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
const { loading, loadingStatus, connected, error, project, widgets, dashboardPages, dashboardPage } = stream

// Board tabs — an agent's widgets can live on named pages (e.g. the main
// chat on the default board, credential entry on "Settings"). One page is
// no chrome; tabs appear only when there is a second board.
const pages = computed(() =>
  (dashboardPages.value || []).map((p: any) => ({
    name: p.Name || p.name,
    title: p.Title || p.title || p.Name || p.name
  }))
)

// The chosen board mirrors into ?board=… so it's linkable, survives refresh,
// and answers browser back/forward. History API, not a router — this
// component ships inside multiple hosts (see ProjectWorkspace's tab routing
// for the same reasoning).
const isBrowser = () => typeof window !== 'undefined'

const boardFromURL = (): string | null => {
  if (!isBrowser()) return null
  return new URLSearchParams(window.location.search).get('board')
}

const syncBoardToURL = (name: string) => {
  if (!isBrowser()) return
  const url = new URL(window.location.href)
  if (url.searchParams.get('board') === name) return
  url.searchParams.set('board', name)
  window.history.pushState({ board: name }, '', url)
}

const applyBoard = (name: string) => {
  if (dashboardPage.value === name) return
  dashboardPage.value = name
  stream.start()
}

const changePage = (name: string) => {
  if (dashboardPage.value === name) return
  syncBoardToURL(name)
  applyBoard(name)
}

const onPopState = () => {
  const board = boardFromURL()
  if (board && board !== dashboardPage.value) applyBoard(board)
}

const agentName = computed(() => project.value?.Name || props.projectName)

// Status chip. "Needs setup" arrives with the setup zone; until then the chip
// reports liveness: Live once the stream is up, Connecting on first load,
// Offline when the stream is down and retrying.
const chip = computed(() => {
  if (connected.value) {
    // "Live" means the stream is up, which is not the same as the agent
    // working. An agent whose credential was never supplied streams
    // perfectly and does nothing — the person who installed it sees green
    // and waits. Say what is actually true.
    if (runHealth.value === 'failing') {
      return {
        label: 'Failing',
        cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
        dot: 'bg-red-500'
      }
    }
    if (runHealth.value === 'never-run') {
      return {
        label: 'Not run yet',
        cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500'
      }
    }
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

// Whether this agent has actually done anything, as distinct from whether its
// stream is connected.
//
// There is no reliable way to detect "missing credential" from here: a setup
// form clears its secret field after a successful save, so an empty field and
// a saved one look identical. What IS knowable is whether the flow has ever
// produced a trace, and whether recent runs carried errors — which covers the
// case that matters, an agent that looks healthy and silently does nothing.
type RunHealth = 'unknown' | 'never-run' | 'failing' | 'ok'
const runHealth = ref<RunHealth>('unknown')

const RUN_WINDOW_HOURS = 24
let runCheckInFlight = false

const refreshRunHealth = async () => {
  if (!props.projectName || runCheckInFlight) return
  // The trace backend is reached through a shared port-forward that the rest
  // of the page also uses; a poller that keeps firing turns one slow read
  // into a queue of them.
  if (typeof document !== 'undefined' && document.hidden) return
  runCheckInFlight = true

  const end = Date.now()
  const start = end - RUN_WINDOW_HOURS * 60 * 60 * 1000
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 5000)
  try {
    const resp: any = await props.client.statistics.getTraces({
      ProjectName: props.projectName,
      Offset: BigInt(0),
      Start: BigInt(start),
      End: BigInt(end)
    }, { signal: abort.signal })
    const traces = resp?.Traces || []
    if (traces.length === 0) {
      runHealth.value = 'never-run'
      return
    }
    runHealth.value = traces.some((t: any) => Number(t.Errors) > 0) ? 'failing' : 'ok'
  } catch {
    // A failed check says nothing about the agent; leave the last verdict.
  } finally {
    clearTimeout(timer)
    runCheckInFlight = false
  }
}

// What to tell someone whose agent has not done anything. A setup board is
// the usual reason — it is where an author puts the form for a credential —
// so point at it when there is one rather than leaving them to hunt.
const setupPage = computed(() => {
  return pages.value.find((p: any) => /setting|setup|config/i.test(p.title || p.name))
})

const attention = computed(() => {
  if (!connected.value || runHealth.value === 'ok' || runHealth.value === 'unknown') return null
  if (runHealth.value === 'failing') {
    return { text: 'Recent runs reported errors. Open the panels below, or check the flow trace.', action: null }
  }
  return {
    text: setupPage.value
      ? 'This agent has not run yet. If it needs a key or a setting, it is on the ' + (setupPage.value.title || setupPage.value.name) + ' tab.'
      : 'This agent has not run yet — it may still be waiting on a schedule, or on something it needs to be given.',
    action: setupPage.value || null
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

let runTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Adopt ?board= before the stream starts so a shared link opens on the
  // right board.
  const board = boardFromURL()
  if (board) dashboardPage.value = board
  if (isBrowser()) window.addEventListener('popstate', onPopState)
  stream.start()
  refreshRunHealth()
  runTimer = setInterval(refreshRunHealth, 30000)
})

onUnmounted(() => {
  if (runTimer) {
    clearInterval(runTimer)
    runTimer = null
  }
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  if (isBrowser()) window.removeEventListener('popstate', onPopState)
  stream.dispose()
})
</script>
