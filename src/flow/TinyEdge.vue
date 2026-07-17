<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'
import utils from '../canvas/utils'

defineOptions({
  inheritAttrs: false,
})

interface EdgeData {
  blocked?: boolean
  valid?: boolean
  error?: string
  trace?: {
    sequence?: number
    latency?: number
    error?: string
  }
  stats?: Record<string, unknown>
}

const props = defineProps<{
  disabled?: boolean
  noConfigure?: boolean
  selected?: boolean
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  data?: EdgeData
  markerEnd?: string
  curvature?: number
  style?: Record<string, unknown>
}>()

defineEmits(['configureEdge'])

const { msToTime } = utils.methods
const { addSelectedEdges, findEdge } = useVueFlow()

const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition as any,
    targetPosition: props.targetPosition as any,
    curvature: props.curvature,
  })
)

const retryCount = computed(() => {
  const raw = props.data?.stats?.['tiny_edge_retry_count']
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? 0), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const retryError = computed(() => {
  const raw = props.data?.stats?.['tiny_edge_retry_count_error']
  return typeof raw === 'string' ? raw : ''
})

// Compute edge style based on validation and trace state
// Colors are handled here (frontend) instead of backend
const computedStyle = computed(() => {
  const baseStyle: Record<string, any> = { strokeWidth: '2px', ...(props.style || {}) }

  // Validation error - red
  if (props.data?.valid === false) {
    baseStyle.stroke = '#fca5a5'
    return baseStyle
  }

  // Trace runtime error - red
  if (props.data?.trace?.error) {
    baseStyle.stroke = '#fca5a5'
    return baseStyle
  }

  // Actively retrying - amber (distinct from pure trace error so the user sees it live)
  if (retryCount.value > 0) {
    baseStyle.stroke = '#f59e0b'
    return baseStyle
  }

  // Was part of trace execution (has sequence) - blue
  if (props.data?.trace?.sequence !== undefined && props.data.trace.sequence >= 0) {
    baseStyle.stroke = '#00bfff'
    return baseStyle
  }

  return baseStyle
})
</script>

<template>
  <BaseEdge :id="id" :style="computedStyle" :path="path[0]" :marker-end="markerEnd" />
  <EdgeLabelRenderer>
    <div
      v-if="!props.data?.blocked"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        color: 'black',
        textAlign: 'center',
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }"
      class="nodrag nopan"
    >
      <button
        v-if="!noConfigure"
        v-tooltip="props.data?.valid === false && props.data?.error ? props.data.error : 'Configure'"
        @click="addSelectedEdges([findEdge(props.id)!])"
      >
        <PencilSquareIcon
          :class="[
            'w-5 h-5',
            !props.data?.valid
              ? 'fill-red-500 stroke-red-200 dark:fill-red-700 dark:stroke-red-300 dark:opacity-70'
              : !props.selected
                ? 'fill-gray-200 text-gray-400 dark:text-gray-300 dark:fill-gray-900 dark:opacity-40'
                : 'fill-indigo-500 stroke-indigo-200 dark:fill-indigo-700 dark:stroke-indigo-300 dark:opacity-70',
          ]"
        />
      </button>
      <div
        v-if="props.data?.trace && props.data.trace.sequence !== undefined && props.data.trace.sequence > 0"
        class="text-xs w-full text-center text-indigo-500"
        :title="'Span# ' + props.data.trace.sequence"
      >
        {{ msToTime(props.data.trace.latency || 0) }}
      </div>
      <div
        v-if="retryCount > 0"
        class="text-xs w-full text-center text-amber-500 font-medium"
        :title="retryError ? 'Retrying: ' + retryError : 'Retrying'"
      >
        ⟳ {{ retryCount }}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>
