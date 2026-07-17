<template>
  <!-- No own border-t and no chevron: the flow page owns the section border
       and the section-collapse indicator (Telemetry's chevron, far right). -->
  <div class="w-full text-sm dark:border-gray-700 relative flex flex-col">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      @click="onHeaderClick"
    >
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Runs</span>
        <div class="flex items-center gap-2 text-xs">
          <span v-if="runningCount > 0" class="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">{{ runningCount }} running</span>
          <span v-if="failedCount > 0" class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">{{ failedCount }} failed</span>
          <span v-if="runs.length > 0" class="text-gray-500 dark:text-gray-400">{{ runs.length }} total</span>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button @click.stop="loadRuns" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Refresh">
          <svg class="w-4 h-4" :class="loading ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
    </div>

    <div v-if="!isCollapsed" class="relative overflow-hidden overflow-y-auto bg-gray-500/5" :style="{ maxHeight: 'var(--exec-h, 26rem)' }">
      <div v-if="runs.length === 0" class="text-center text-xs p-3 text-gray-500">
        No runs yet. Each time this flow runs, it appears here — open one to see its steps, timing, and data.
      </div>

      <div v-for="run in runs" :key="run.RunID" class="border-b border-gray-100 dark:border-gray-800">
        <!-- Run row -->
        <div
          class="flex items-center gap-2 px-3 py-1.5 font-mono text-xs hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
          @click="toggleRun(run.RunID)"
        >
          <ChevronRightIcon :class="['w-3 h-3 transition-transform flex-shrink-0', expanded === run.RunID ? 'rotate-90' : '']" />
          <span :title="run.RunID">{{ run.RunID.slice(0, 8) }}…</span>
          <button
            @click.stop="copyRunId(run.RunID)"
            class="p-0.5 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            :title="copiedRun === run.RunID ? 'Copied!' : 'Copy run ID'"
          >
            <CheckIcon v-if="copiedRun === run.RunID" class="w-3 h-3 text-emerald-500" />
            <ClipboardIcon v-else class="w-3 h-3" />
          </button>
          <span :class="statusClass(run.Status)" class="px-1.5 py-0.5 rounded">{{ run.Status }}</span>
          <span class="text-gray-500">{{ run.StepCount }} steps<span v-if="run.PendingSteps > 0"> · {{ run.PendingSteps }} pending</span></span>
          <span v-if="runDuration(run) > 0" class="text-indigo-500 dark:text-indigo-400">{{ formatDuration(runDuration(run)) }}</span>
          <span class="text-gray-500 ml-auto">{{ formatWhen(run.StartedAt) }}</span>
          <button
            @click.stop="rerun(run.RunID)"
            :disabled="busyRun === run.RunID"
            class="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 text-gray-700 dark:text-gray-200 disabled:opacity-50 transition-colors"
            title="Run this again with the same input"
          >{{ busyRun === run.RunID && busyAction === 'rerun' ? '…' : 'Re-run' }}</button>
          <button
            v-if="run.Status === 'failed'"
            @click.stop="retry(run.RunID)"
            :disabled="busyRun === run.RunID"
            class="px-2 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 transition-colors"
            title="Resume from where it failed"
          >{{ busyRun === run.RunID && busyAction === 'retry' ? '…' : 'Retry' }}</button>
        </div>

        <!-- Expanded: step waterfall (timing folded in) + inline output -->
        <div v-if="expanded === run.RunID" class="px-3 pb-2 pt-1 bg-gray-100/50 dark:bg-gray-900/50">
          <div v-if="stepsLoading" class="text-gray-500 text-xs p-1">Loading…</div>
          <div v-else-if="steps.length === 0" class="text-gray-500 text-xs p-1">No step records yet.</div>
          <div v-else class="flex flex-col gap-px">
            <template v-for="step in steps" :key="step.StepKey">
              <div
                class="flex items-center gap-2 px-1 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                @click="onStepClick(step)"
              >
                <span :class="step.Status === 'failed' ? 'bg-red-400' : 'bg-emerald-400'" class="w-2 h-2 rounded-full flex-shrink-0"></span>
                <span class="text-gray-700 dark:text-gray-300 w-40 truncate" :title="step.Node">{{ nodeLabel(step.Node) }}</span>
                <!-- Waterfall bar: offset by start, width by duration -->
                <div class="flex-1 h-3 relative rounded bg-gray-200/60 dark:bg-gray-800/60 min-w-[80px]">
                  <div
                    class="absolute top-0 h-3 rounded"
                    :class="step.Status === 'failed' ? 'bg-red-400' : 'bg-indigo-400 dark:bg-indigo-500'"
                    :style="barStyle(step)"
                  ></div>
                </div>
                <span class="text-indigo-500 dark:text-indigo-400 w-14 text-right">{{ Number(step.DurationMs) > 0 ? formatDuration(step.DurationMs) : '—' }}</span>
                <ChevronRightIcon
                  v-if="step.InputPreview"
                  :class="['w-3 h-3 text-gray-400 transition-transform', openStep === step.StepKey ? 'rotate-90' : '']"
                />
                <span v-else class="w-3"></span>
              </div>
              <div v-if="step.Error" class="ml-6 text-red-500 text-[11px] pb-1">{{ step.Error }}</div>
              <!-- Inline output: what flowed into this step -->
              <pre
                v-if="openStep === step.StepKey && step.InputPreview"
                class="ml-6 mb-1 p-2 rounded bg-gray-900 text-gray-100 dark:bg-black text-[11px] leading-snug overflow-x-auto max-h-52 overflow-y-auto"
              >{{ step.InputPreview }}</pre>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { notify } from 'notiwind'
import { ChevronRightIcon, ClipboardIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { useEditorClient } from '../store/client'

interface RunStep {
  StepKey: string; Node: string; Status: string; Error: string
  CompletedAt: string; StartedAt: string; DurationMs: number | bigint
  InputPreview: string; InputBytes: number | bigint
}
interface Run {
  RunID: string; Status: string; StepCount: number; PendingSteps: number
  StartedAt: string; LastActivityAt: string
}

// `collapsed` prop makes the panel parent-controlled (the flow page collapses
// RUNS + TELEMETRY as ONE section); when absent the panel manages itself.
const props = defineProps<{ projectName: string; flowName: string; initialRun?: string | null; initialStep?: string | null; collapsed?: boolean }>()
const emit = defineEmits<{
  (e: 'select-node', nodeId: string): void
  (e: 'open-run', runId: string | null): void
  (e: 'open-step', stepKey: string | null): void
  (e: 'toggle'): void
  (e: 'expand'): void
  // Emitted after every load with the run count, so the parent can hide
  // this pane entirely for flows that produce no durable runs (classic
  // flows) — an empty "No runs yet" reads as "this flow never ran",
  // which is a lie when Telemetry right next to it shows the traces.
  (e: 'count', n: number): void
}>()

const client = useEditorClient()

const localCollapsed = ref(true)
const isCollapsed = computed(() => props.collapsed !== undefined ? props.collapsed : localCollapsed.value)
const onHeaderClick = () => {
  if (props.collapsed !== undefined) emit('toggle')
  else localCollapsed.value = !localCollapsed.value
}
const expandPanel = () => {
  if (props.collapsed !== undefined) emit('expand')
  else localCollapsed.value = false
}
const loading = ref(false)
const runs = ref<Run[]>([])
const expanded = ref<string | null>(null)
const steps = ref<RunStep[]>([])
const stepsLoading = ref(false)
const openStep = ref<string | null>(null)
const busyRun = ref<string | null>(null)
const busyAction = ref<'rerun' | 'retry' | null>(null)
const copiedRun = ref<string | null>(null)

async function copyRunId(runID: string) {
  try {
    await navigator.clipboard.writeText(runID)
    copiedRun.value = runID
    setTimeout(() => { if (copiedRun.value === runID) copiedRun.value = null }, 1500)
  } catch { /* clipboard unavailable */ }
}

const runningCount = computed(() => runs.value.filter(r => r.Status === 'running').length)
const failedCount = computed(() => runs.value.filter(r => r.Status === 'failed').length)

// Whole-run wall time = last completion − first start, from the step ledger.
function runDuration(run: Run) {
  const start = new Date(run.StartedAt).getTime()
  const end = new Date(run.LastActivityAt).getTime()
  return isNaN(start) || isNaN(end) ? 0 : Math.max(0, end - start)
}

// Waterfall geometry: position each bar within the run's total span.
const spanStart = computed(() => Math.min(...steps.value.map(s => new Date(s.StartedAt || s.CompletedAt).getTime()).filter(n => !isNaN(n))))
const spanEnd = computed(() => Math.max(...steps.value.map(s => new Date(s.CompletedAt).getTime()).filter(n => !isNaN(n))))
function barStyle(step: RunStep) {
  const total = spanEnd.value - spanStart.value || 1
  const start = new Date(step.StartedAt || step.CompletedAt).getTime()
  const dur = Number(step.DurationMs) || 0
  const left = isNaN(start) ? 0 : ((start - spanStart.value) / total) * 100
  const width = Math.max(2, (dur / total) * 100)
  return { left: `${Math.min(98, left)}%`, width: `${Math.min(100 - Math.min(98, left), width)}%` }
}

async function loadRuns() {
  loading.value = true
  try {
    const resp = await client.runs.listRuns({ ProjectName: props.projectName, FlowName: props.flowName })
    runs.value = resp.Runs
  } catch { runs.value = [] } finally {
    loading.value = false
    emit('count', (runs.value || []).length)
  }
}

async function toggleRun(runID: string) {
  if (expanded.value === runID) {
    expanded.value = null
    emit('open-run', null); emit('open-step', null)
    return
  }
  expanded.value = runID
  openStep.value = null
  emit('open-run', runID); emit('open-step', null)
  stepsLoading.value = true
  steps.value = []
  try {
    const resp = await client.runs.getRun({ ProjectName: props.projectName, RunID: runID })
    steps.value = resp.Steps
  } catch (e: any) {
    notify({ group: 'error', title: 'Run', text: e?.message || 'Failed to load run' }, 4000)
  } finally { stepsLoading.value = false }
}

function onStepClick(step: RunStep) {
  if (step.InputPreview) openStep.value = openStep.value === step.StepKey ? null : step.StepKey
  emit('open-step', openStep.value)
  emit('select-node', step.Node) // jump to node on canvas
}

async function rerun(runID: string) {
  busyRun.value = runID; busyAction.value = 'rerun'
  try {
    const resp = await client.runs.rerunRun({ ProjectName: props.projectName, RunID: runID })
    notify({ group: 'success', title: 'Re-running', text: `New run ${resp.NewRunID.slice(0, 8)}…` }, 3000)
    setTimeout(loadRuns, 800)
  } catch (e: any) {
    notify({ group: 'error', title: 'Re-run failed', text: e?.message || 'Could not re-run' }, 4000)
  } finally { busyRun.value = null; busyAction.value = null }
}

async function retry(runID: string) {
  busyRun.value = runID; busyAction.value = 'retry'
  try {
    const resp = await client.runs.retryRun({ ProjectName: props.projectName, RunID: runID })
    notify({ group: 'success', title: 'Retried', text: `${resp.Redriven} step(s) re-driven` }, 3000)
    await loadRuns()
    if (expanded.value === runID) { expanded.value = null; await toggleRun(runID) }
  } catch (e: any) {
    notify({ group: 'error', title: 'Retry failed', text: e?.message || 'Could not retry' }, 4000)
  } finally { busyRun.value = null; busyAction.value = null }
}

function statusClass(status: string) {
  if (status === 'failed') return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
  if (status === 'complete') return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
  return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
}
function nodeLabel(node: string) {
  const [, moduleName, nodeName] = node.split('.')
  if (!moduleName || !nodeName) return node
  return `${nodeName} · ${moduleName.replace('tinysystems-', '')}`
}
function formatWhen(rfc3339: string) {
  if (!rfc3339) return ''
  const d = new Date(rfc3339)
  return isNaN(d.getTime()) ? rfc3339 : d.toLocaleTimeString()
}
function formatDuration(ms: number | bigint) {
  const n = Number(ms)
  if (n < 1000) return `${n}ms`
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)}s`
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  await loadRuns()
  // Deep-link: a run/step in the URL opens the panel, expands that run, and
  // applies it (non-silent so the parent drives edges/inspection from it).
  if (props.initialRun) {
    expandPanel()
    await toggleRun(props.initialRun)
    if (props.initialStep && steps.value.some(s => s.StepKey === props.initialStep)) {
      openStep.value = props.initialStep
    }
  }
  timer = setInterval(() => { if (!isCollapsed.value && runningCount.value > 0) loadRuns() }, 4000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
