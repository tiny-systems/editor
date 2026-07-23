<!--
  Edge retry policy editor. Renders inline above the edge
  configuration JSON form when an edge is selected.

  Defaults preserve the no-implicit-retry contract: MaxAttempts = 1
  (single shot). Authors opt in per edge for retry-safe targets
  (webhooks, idempotent writes).

  Errors a module marks permanent (module.NonRetryable(code, err) /
  PermanentError) are skipped by the scheduler automatically — the
  author never lists them. So the codes field is an advanced override
  for ADDITIONAL codes only, and shows only once retries are enabled
  (MaxAttempts > 1); on a single-shot edge it's irrelevant.

  Persists onto edge.data.retryPolicy; the backend reads it from
  TinyNodeEdge.RetryPolicy when scheduling re-dispatch.
-->
<template>
  <div class="my-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30 overflow-hidden">
    <button
      type="button"
      @click="expanded = !expanded"
      class="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
    >
      <span class="flex items-center gap-1">
        <svg class="w-3 h-3" :class="{ 'rotate-90': expanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        Retry policy
      </span>
      <span class="font-normal text-gray-400 dark:text-gray-500">{{ summary }}</span>
    </button>

    <div v-if="expanded" class="px-2 py-2 text-xs space-y-1.5 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <span class="text-gray-700 dark:text-gray-300">Per-attempt timeout (ms)</span>
        <input
          type="number"
          min="0"
          :value="props.modelValue?.timeoutMs ?? ''"
          @input="setField('timeoutMs', ($event.target as HTMLInputElement).valueAsNumber)"
          placeholder="default 300000"
          :disabled="disabled"
          class="w-24 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-700 dark:text-gray-300">Max attempts</span>
        <input
          type="number"
          min="1"
          max="10"
          :value="maxAttempts"
          @input="setMaxAttempts(($event.target as HTMLInputElement).valueAsNumber)"
          :disabled="disabled"
          class="w-16 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
      </div>

      <template v-if="maxAttempts > 1">
        <div class="flex items-center justify-between">
          <span class="text-gray-700 dark:text-gray-300">Initial delay (ms)</span>
          <input
            type="number"
            min="0"
            :value="props.modelValue?.initialDelayMs ?? ''"
            @input="setField('initialDelayMs', ($event.target as HTMLInputElement).valueAsNumber)"
            placeholder="1000"
            :disabled="disabled"
            class="w-20 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-700 dark:text-gray-300">Backoff coefficient</span>
          <input
            type="text"
            :value="props.modelValue?.backoffCoefficient ?? ''"
            @input="setField('backoffCoefficient', ($event.target as HTMLInputElement).value)"
            placeholder="2.0"
            :disabled="disabled"
            class="w-20 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-700 dark:text-gray-300">Max delay (ms)</span>
          <input
            type="number"
            min="0"
            :value="props.modelValue?.maxDelayMs ?? ''"
            @input="setField('maxDelayMs', ($event.target as HTMLInputElement).valueAsNumber)"
            placeholder="30000"
            :disabled="disabled"
            class="w-20 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          />
        </div>

        <div class="pt-1">
          <div class="text-gray-700 dark:text-gray-300 mb-0.5">Also skip retry for codes <span class="text-gray-400 dark:text-gray-500 font-normal">(optional, comma-separated)</span></div>
          <div class="text-gray-400 dark:text-gray-500 mb-1 leading-snug">Errors a module marks permanent — auth, quota, content-filter — are never retried automatically; you don't list them. Use this only to force-skip retry for extra codes.</div>
          <input
            type="text"
            :value="nonRetryableInput"
            @input="onCodesInput(($event.target as HTMLInputElement).value)"
            @blur="commitCodes"
            placeholder=""
            :disabled="disabled"
            class="w-full px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface RetryPolicy {
  maxAttempts?: number
  initialDelayMs?: number
  backoffCoefficient?: string
  maxDelayMs?: number
  timeoutMs?: number
  nonRetryableErrorCodes?: string[]
}

const props = defineProps<{
  modelValue?: RetryPolicy | null
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: RetryPolicy | null): void }>()

const expanded = ref(false)

// Source of truth for derived values: props.modelValue. No local
// shadow state, no watchers — every input emits a normalized payload
// directly, which the parent stamps onto edge.data.retryPolicy and
// flows back as the new props. Single-direction = no reactivity loop.

const maxAttempts = computed(() => props.modelValue?.maxAttempts ?? 1)

const summary = computed(() => {
  const n = maxAttempts.value
  const t = props.modelValue?.timeoutMs ?? 0
  const codes = props.modelValue?.nonRetryableErrorCodes ?? []
  const parts: string[] = []
  if (n > 1) parts.push(`${n} attempts`)
  if (t > 0) parts.push(`${Math.round(t / 1000)}s timeout`)
  if (codes.length > 0) parts.push(`${codes.length} non-retryable`)
  return parts.length > 0 ? parts.join(', ') : 'Single shot'
})

// Local string buffer for the comma-separated codes field. Only the
// `commit` on blur turns the string into a sanitized string[] and
// emits — typing intermediate states wouldn't roundtrip cleanly.
const nonRetryableInput = ref(((props.modelValue?.nonRetryableErrorCodes) ?? []).join(', '))
function onCodesInput(v: string) {
  nonRetryableInput.value = v
}

function normalize(next: RetryPolicy): RetryPolicy | null {
  const n = next.maxAttempts ?? 1
  const codes = next.nonRetryableErrorCodes ?? []
  const t = next.timeoutMs ?? 0
  if (n <= 1 && codes.length === 0 && t === 0) return null
  const out: RetryPolicy = { maxAttempts: n }
  if (next.initialDelayMs) out.initialDelayMs = next.initialDelayMs
  if (next.backoffCoefficient) out.backoffCoefficient = next.backoffCoefficient
  if (next.maxDelayMs) out.maxDelayMs = next.maxDelayMs
  if (t > 0) out.timeoutMs = t
  if (codes.length > 0) out.nonRetryableErrorCodes = codes
  return out
}

function setMaxAttempts(v: number) {
  const n = Number.isFinite(v) && v > 0 ? Math.floor(v) : 1
  emit('update:modelValue', normalize({ ...(props.modelValue ?? {}), maxAttempts: n }))
}

function setField<K extends keyof RetryPolicy>(key: K, value: RetryPolicy[K]) {
  emit('update:modelValue', normalize({ ...(props.modelValue ?? {}), [key]: value } as RetryPolicy))
}

function commitCodes() {
  const codes = nonRetryableInput.value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  emit('update:modelValue', normalize({ ...(props.modelValue ?? {}), nonRetryableErrorCodes: codes }))
}
</script>
