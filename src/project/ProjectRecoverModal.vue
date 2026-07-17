<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="fixed inset-0 overflow-auto z-10 p-4 sm:p-6 md:p-20" @close="onClose">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                       leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <DialogOverlay
          :class="['fixed inset-0', 'bg-gray-500 bg-opacity-25 transition-opacity dark:bg-black dark:bg-opacity-75 backdrop-blur-sm']"/>
      </TransitionChild>
      <TransitionChild as="template" enter="ease-out duration-300"
                       enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200"
                       leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
        <DialogPanel
          class="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 p-1 sm:w-full sm:max-w-3xl mx-auto dark:bg-black dark:border dark:border-gray-800 dark:text-gray-300">
          <DialogTitle as="h3" class="text-center sm:mt-3 font-medium text-gray-900 dark:text-gray-100">
            Recover Project
          </DialogTitle>

          <!-- Idle state: ask for confirmation before kicking off the stream -->
          <div v-if="!started" class="px-4 py-4 space-y-3">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              The TinyProject resource for <span class="font-mono">{{ projectName }}</span>
              is missing from the cluster. Recovery rebuilds the project, its flows, nodes,
              and dashboard pages from the platform database.
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Read-only on the database. Idempotent — already-existing resources are skipped.
            </p>
          </div>

          <!-- Running / done: progress log + per-phase bar -->
          <div v-else class="px-3 pb-2 space-y-3">
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-gray-700 dark:text-gray-300">{{ phaseLabel }}</span>
                <span v-if="total > 0" class="text-gray-500 dark:text-gray-400">{{ current }} / {{ total }}</span>
              </div>
              <div class="h-1.5 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                <div
                  class="h-full transition-all duration-300"
                  :class="errorMessage ? 'bg-red-500' : (done ? 'bg-green-500' : 'bg-indigo-500')"
                  :style="{ width: progressPct + '%' }"
                />
              </div>
            </div>

            <div ref="logEl"
                 class="max-h-72 overflow-y-auto rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-2 font-mono text-xs space-y-0.5">
              <div v-for="(line, i) in log" :key="i"
                   :class="{ 'text-red-600 dark:text-red-400': line.kind === 'error',
                             'text-green-600 dark:text-green-400': line.kind === 'done',
                             'text-gray-700 dark:text-gray-300': line.kind === 'info' }">
                {{ line.text }}
              </div>
            </div>

            <div v-if="errorMessage" class="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2">
              <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap font-mono">{{ errorMessage }}</pre>
            </div>
          </div>

          <div class="flex justify-end p-3 gap-2">
            <button v-if="!started"
                    @click="onClose"
                    type="button"
                    class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-3 py-1 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
              Cancel
            </button>
            <button v-if="!started"
                    @click="recover"
                    type="button"
                    class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 rounded-md text-sm font-medium px-4 py-1.5 dark:bg-indigo-700 dark:hover:bg-indigo-600">
              Recover
            </button>
            <button v-if="started && (done || errorMessage)"
                    @click="onFinish"
                    type="button"
                    class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 rounded-md text-sm font-medium px-4 py-1.5 dark:bg-indigo-700 dark:hover:bg-indigo-600">
              {{ done ? 'Reload project' : 'Close' }}
            </button>
          </div>
        </DialogPanel>
      </TransitionChild>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
  DialogOverlay,
} from '@headlessui/vue'
import { ref, computed, nextTick } from 'vue'
import { useEditorClient } from '../store/client'

// Inlined from the platform proto enum (project.messages_pb RecoveryPhase).
// The library is proto-free, so the numeric wire values are declared locally;
// they must stay in sync with the server's RecoveryPhase.
const RecoveryPhase = {
  RECOVERY_LOAD_PROJECT: 1,
  RECOVERY_LOAD_FLOWS: 2,
  RECOVERY_LOAD_NODES: 3,
  RECOVERY_LOAD_PAGES: 4,
  RECOVERY_APPLY_PROJECT: 10,
  RECOVERY_APPLY_FLOWS: 11,
  RECOVERY_APPLY_NODES: 12,
  RECOVERY_APPLY_PAGES: 13,
  RECOVERY_REREGISTER_MODULES: 14,
  RECOVERY_DONE: 20,
  RECOVERY_ERROR: 99,
} as const

const props = defineProps<{
  projectName: string
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const client = useEditorClient()

type LogLine = { text: string; kind: 'info' | 'error' | 'done' }

const started = ref(false)
const done = ref(false)
const current = ref(0)
const total = ref(0)
const phaseLabel = ref('Preparing...')
const log = ref<LogLine[]>([])
const errorMessage = ref('')
const logEl = ref<HTMLElement | null>(null)

const progressPct = computed(() => {
  if (errorMessage.value) return 100
  if (done.value) return 100
  if (total.value === 0) return 5
  return Math.max(5, Math.min(100, Math.round((current.value / total.value) * 100)))
})

function phaseToLabel(phase: number): string {
  switch (phase) {
    case RecoveryPhase.RECOVERY_LOAD_PROJECT: return 'Loading project from database'
    case RecoveryPhase.RECOVERY_LOAD_FLOWS:   return 'Loading flows from database'
    case RecoveryPhase.RECOVERY_LOAD_NODES:   return 'Loading nodes from database'
    case RecoveryPhase.RECOVERY_LOAD_PAGES:   return 'Loading pages from database'
    case RecoveryPhase.RECOVERY_APPLY_PROJECT: return 'Restoring project resource'
    case RecoveryPhase.RECOVERY_APPLY_FLOWS:   return 'Restoring flows'
    case RecoveryPhase.RECOVERY_APPLY_NODES:   return 'Restoring nodes'
    case RecoveryPhase.RECOVERY_APPLY_PAGES:   return 'Restoring dashboard pages'
    case RecoveryPhase.RECOVERY_REREGISTER_MODULES: return 'Re-registering module pods'
    case RecoveryPhase.RECOVERY_DONE:          return 'Recovery complete'
    case RecoveryPhase.RECOVERY_ERROR:         return 'Recovery failed'
    default:                                   return 'Working...'
  }
}

async function appendLog(line: LogLine) {
  log.value.push(line)
  await nextTick()
  if (logEl.value) {
    logEl.value.scrollTop = logEl.value.scrollHeight
  }
}

async function recover() {
  started.value = true
  current.value = 0
  total.value = 0

  try {
    const req = { ProjectName: props.projectName }
    for await (const ev of client.project.recover(req)) {
      phaseLabel.value = phaseToLabel(ev.Phase)
      if (ev.Total > 0) total.value = ev.Total
      if (ev.Current > 0) current.value = ev.Current

      if (ev.Phase === RecoveryPhase.RECOVERY_ERROR) {
        errorMessage.value = ev.Error || 'Recovery failed'
        await appendLog({ text: ev.Error || ev.Message, kind: 'error' })
        return
      }
      if (ev.Phase === RecoveryPhase.RECOVERY_DONE) {
        done.value = true
        await appendLog({ text: ev.Message || 'Recovery complete', kind: 'done' })
        return
      }
      if (ev.Message) {
        await appendLog({ text: ev.Message, kind: 'info' })
      }
    }
    // Stream ended without explicit DONE (shouldn't normally happen).
    if (!done.value && !errorMessage.value) {
      done.value = true
    }
  } catch (e: any) {
    errorMessage.value = e?.message || String(e)
    await appendLog({ text: errorMessage.value, kind: 'error' })
  }
}

function onClose() {
  if (started.value && !done.value && !errorMessage.value) {
    // Don't allow closing mid-recovery — user can wait it out or use the close
    // button which appears after DONE/ERROR.
    return
  }
  emit('close')
}

function onFinish() {
  if (done.value) {
    emit('success')
  }
  emit('close')
}
</script>
