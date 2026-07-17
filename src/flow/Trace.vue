<template>
  <div class="absolute z-50 top-2 left-2 text-white text-sm" v-if="props.trace">
    <!-- Collapsed header -->
    <div class="border dark:border-gray-700 rounded bg-indigo-400 dark:bg-indigo-800 p-1 px-2 flex items-center gap-2">
      <a href="#" @click.prevent="toggleExpand" class="hover:underline font-mono text-xs">
        trace#{{ props.trace }}
      </a>
      <span v-if="loading" class="text-xs opacity-70">loading...</span>
      <a href="#" @click.prevent="resetTrace" class="px-1">&times;</a>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="mt-1 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded shadow-lg max-w-xl max-h-96 overflow-auto">
      <div class="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 px-3 py-2 border-b dark:border-gray-700 flex justify-between items-center">
        <span class="text-gray-700 dark:text-gray-300 font-mono text-xs">{{ traceData?.TraceID || props.trace }}</span>
        <div class="flex items-center gap-2">
          <span class="text-gray-500 text-xs">{{ traceData?.Spans?.length || 0 }} spans</span>
          <button
            @click="copyTrace"
            class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            :title="copied ? 'Copied!' : 'Copy trace JSON'"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>
      <div class="p-2" v-if="traceData">
        <VueJsonPretty :data="formattedTraceData" :theme="isDark ? 'dark' : 'light'" :deep="1" />
      </div>
      <div v-else-if="error" class="p-3 text-red-500 text-xs">
        {{ error }}
      </div>
      <div v-else class="p-3 text-gray-500 text-xs">
        No trace data available
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDark } from '@vueuse/core'
import { useEditorClient } from '../store/client'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const props = defineProps<{
  trace: string
  projectName: string
}>()

const emit = defineEmits(['close'])

const client = useEditorClient()
const isDark = useDark()

const expanded = ref(false)
const loading = ref(false)
const traceData = ref<any>(null)
const error = ref('')
const copied = ref(false)

const formattedTraceData = computed(() => {
  if (!traceData.value?.Spans) return {}

  // Format spans for display
  return {
    traceId: traceData.value.TraceID,
    spans: traceData.value.Spans.map((span: any) => ({
      name: span.Name,
      spanId: span.SpanID,
      parentSpanId: span.ParentSpanID || null,
      duration: span.EndTimeUnixNano && span.StartTimeUnixNano
        ? `${((Number(span.EndTimeUnixNano) - Number(span.StartTimeUnixNano)) / 1000000).toFixed(2)}ms`
        : null,
      status: span.Status || null,
      attributes: span.Attributes?.reduce((acc: any, attr: any) => {
        acc[attr.Key] = attr.Value
        return acc
      }, {}) || {},
      events: span.Events?.map((e: any) => ({
        name: e.Name,
        attributes: e.Attributes?.reduce((acc: any, attr: any) => {
          acc[attr.Key] = attr.Value
          return acc
        }, {}) || {}
      })) || []
    }))
  }
})

async function copyTrace() {
  if (!formattedTraceData.value) return

  try {
    await navigator.clipboard.writeText(JSON.stringify(formattedTraceData.value, null, 2))
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to copy trace:', e)
  }
}

async function fetchTraceData() {
  if (!client || !props.trace || !props.projectName) return

  loading.value = true
  error.value = ''

  try {
    const response = await client.statistics.getTraceByID({
      TraceID: props.trace,
      ProjectName: props.projectName
    })
    traceData.value = response
  } catch (e: any) {
    error.value = e.message || 'Failed to load trace'
    console.error('Failed to fetch trace:', e)
  } finally {
    loading.value = false
  }
}

function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value && !traceData.value) {
    fetchTraceData()
  }
}

function resetTrace() {
  expanded.value = false
  traceData.value = null
  emit('close')
}

// Reset state when trace changes
watch(() => props.trace, () => {
  traceData.value = null
  error.value = ''
  if (expanded.value) {
    fetchTraceData()
  }
})
</script>

<style scoped>
:deep(.vjs-tree) {
  font-size: 10px !important;
  line-height: 1.4 !important;
}

/* Light theme - force all text to be visible */
:deep(.vjs-tree[data-theme="light"]),
:deep(.vjs-tree.is-light),
:deep(.vjs-tree:not(.is-dark)) {
  color: #333 !important;
  background: transparent !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-key),
:deep(.vjs-tree.is-light .vjs-key),
:deep(.vjs-tree:not(.is-dark) .vjs-key) {
  color: #881391 !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-value-string),
:deep(.vjs-tree.is-light .vjs-value-string),
:deep(.vjs-tree:not(.is-dark) .vjs-value-string) {
  color: #c41a16 !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-value-number),
:deep(.vjs-tree.is-light .vjs-value-number),
:deep(.vjs-tree:not(.is-dark) .vjs-value-number) {
  color: #1c00cf !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-value-boolean),
:deep(.vjs-tree.is-light .vjs-value-boolean),
:deep(.vjs-tree:not(.is-dark) .vjs-value-boolean) {
  color: #1c00cf !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-value-null),
:deep(.vjs-tree.is-light .vjs-value-null),
:deep(.vjs-tree:not(.is-dark) .vjs-value-null) {
  color: #808080 !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-tree__brackets),
:deep(.vjs-tree.is-light .vjs-tree__brackets),
:deep(.vjs-tree:not(.is-dark) .vjs-tree__brackets) {
  color: #333 !important;
}

:deep(.vjs-tree[data-theme="light"] .vjs-tree__content),
:deep(.vjs-tree.is-light .vjs-tree__content),
:deep(.vjs-tree:not(.is-dark) .vjs-tree__content) {
  border-color: #e0e0e0 !important;
}

/* Tree lines visibility - light theme */
:deep(.vjs-tree[data-theme="light"] .vjs-tree__indent),
:deep(.vjs-tree.is-light .vjs-tree__indent),
:deep(.vjs-tree:not(.is-dark) .vjs-tree__indent) {
  border-left: 1px dashed #999 !important;
}

/* Dark theme */
:deep(.vjs-tree.is-dark .vjs-tree__indent),
:deep(.vjs-tree[data-theme="dark"] .vjs-tree__indent) {
  border-left: 1px dashed #4b5563 !important;
}

/* Caret/expand icons - ensure visibility */
:deep(.vjs-tree[data-theme="light"] .vjs-tree__node .vjs-carets),
:deep(.vjs-tree.is-light .vjs-carets),
:deep(.vjs-tree:not(.is-dark) .vjs-carets) {
  color: #666 !important;
}
</style>
