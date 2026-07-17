<script lang="ts" setup>
import {ref, watch, computed} from 'vue'
import type {CSSProperties} from 'vue'
import {Handle, Position} from '@vue-flow/core'
import InlineOverlay from './InlineOverlay.vue'
import {AdjustmentsHorizontalIcon, GlobeAltIcon, ExclamationTriangleIcon} from "@heroicons/vue/24/outline"
import utils from './utils'

interface HandleProps {
  id?: string
  position?: Number
  virtual?: Boolean
  rotated_position: Number
  type?: string
  label?: string
  error?: string
}

interface NodeData {
  handles: HandleProps[]
  blocked: boolean
}

const emits = defineEmits(['updateNodeInternals'])
const props = defineProps(['data', 'selected', 'id', 'noExpire'])

watch(props, () => emits('updateNodeInternals'), {deep: true})

// ---------- handle position & style ----------

const calculateHandlerClass = (h: HandleProps, nodeData: NodeData) => {
  if (h.error) {
    return 'bg-rose-100 border-rose-300 text-rose-600 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-300'
  }
  if (nodeData?.blocked) {
    return 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
  }
  return 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
}

const calculateHandlerStyle = (h: HandleProps, nodeData: NodeData): CSSProperties => {
  const style: CSSProperties = {
    height: '12px',
    width: '12px',
    borderRadius: '50%',
    fontSize: '10px',
    textWrap: 'nowrap',
    fontWeight: '500',
  }
  const sameSideHandles = (nodeData?.handles || []).filter(
    (a: HandleProps) => a.rotated_position == h.rotated_position && !a.virtual && !a.id?.startsWith('_')
  )
  let idx = 0
  for (let i = 0; i < sameSideHandles.length; i++) {
    if (h.id === sameSideHandles[i].id) idx = i
  }
  const total = sameSideHandles.length || 1
  const offsetPct = (idx + 1) * 100 / (total + 1) + '%'

  if (h.rotated_position == 1) { // right
    style.right = '-6px'
    style.top = offsetPct
    style.paddingLeft = '18px'
    style.lineHeight = '12px'
  } else if (h.rotated_position == 3) { // left
    style.left = '-6px'
    style.top = offsetPct
    style.paddingRight = '18px'
    style.direction = 'rtl'
    style.lineHeight = '12px'
  } else if (h.rotated_position == 2) { // bottom
    style.bottom = '-6px'
    style.left = offsetPct
    style.writingMode = 'vertical-rl'
    style.paddingTop = '18px'
    style.lineHeight = '12px'
  } else { // top
    style.top = '-6px'
    style.left = offsetPct
    style.writingMode = 'vertical-lr'
    style.direction = 'rtl'
    style.paddingBottom = '18px'
    style.lineHeight = '12px'
  }
  return style
}

const posIntToStr = (n: Number) => {
  switch (n) {
    case 0: return Position.Top
    case 1: return Position.Right
    case 2: return Position.Bottom
    case 3: return Position.Left
  }
}

// ---------- card layout ----------

const visibleHandles = computed(() =>
  (props.data?.handles || []).filter((h: HandleProps) => !h.virtual && !h.id?.startsWith('_'))
)

// Compact rectangular card. Width is fixed-ish; height grows with the
// number of side handles so each handle has breathing room.
const cardStyle = computed<CSSProperties>(() => {
  const sideHandleCount = Math.max(
    visibleHandles.value.filter((h: HandleProps) => h.rotated_position == 1).length,
    visibleHandles.value.filter((h: HandleProps) => h.rotated_position == 3).length,
  )
  return {
    width: '220px',
    minHeight: Math.max(64, sideHandleCount * 28 + 56) + 'px',
  }
})

// ---------- iconography ----------

// Map a component name to a tinted color so the icon square matches
// the component's "family" at a glance. Stable hash so the same name
// always gets the same color.
// Deeper tints + bolder foregrounds so the icon square actually
// asserts the node's family. Previous pastel was too quiet on a
// light canvas.
const palette = [
  {bg: 'bg-indigo-500 dark:bg-indigo-600',         fg: 'text-white'},
  {bg: 'bg-emerald-500 dark:bg-emerald-600', fg: 'text-white'},
  {bg: 'bg-violet-500 dark:bg-violet-600',   fg: 'text-white'},
  {bg: 'bg-amber-500 dark:bg-amber-600',     fg: 'text-white'},
  {bg: 'bg-rose-500 dark:bg-rose-600',       fg: 'text-white'},
  {bg: 'bg-indigo-500 dark:bg-indigo-600',   fg: 'text-white'},
  {bg: 'bg-teal-500 dark:bg-teal-600',       fg: 'text-white'},
  {bg: 'bg-pink-500 dark:bg-pink-600',       fg: 'text-white'},
]
const iconTint = computed(() => {
  const key = (props.data?.component || props.data?.label || props.id || '') as string
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff
  return palette[hash % palette.length]
})
const iconLetter = computed(() => {
  const key = (props.data?.component || props.data?.label || '?') as string
  return key.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '?'
})

// ---------- state-driven card classes ----------

const hasError = computed(() => Boolean(props.data?.trace?.error) || Boolean(props.data?.error))
const cardClasses = computed(() => {
  const base = 'tiny-node rounded-xl px-3 py-2.5 transition-all duration-150 cursor-pointer flex items-start gap-2.5'
  if (hasError.value) {
    return base + (props.selected
      ? ' bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-600 ring-2 ring-rose-200 dark:ring-rose-900/60 shadow-md'
      : ' bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 shadow-sm')
  }
  if (props.data?.blocked) {
    return base + (props.selected
      ? ' bg-gray-50 dark:bg-gray-900 border-2 border-gray-400 dark:border-gray-500 ring-2 ring-gray-200 shadow-md blocked'
      : ' bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 blocked')
  }
  return base + (props.selected
    ? ' bg-white dark:bg-gray-900 border-2 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/60 shadow-lg'
    : ' bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-gray-400 dark:hover:border-gray-600')
})

// ---------- loading watchdog (unchanged behavior) ----------

const loading = ref(false)
setInterval(() => {
  if (!props || !props.data) return
  const n = new Date(props.data.last_status_update * 1000).getTime()
  if (!n) { loading.value = true; return }
  loading.value = (Date.now().valueOf() - n) > 10 * 60 * 1000
}, 2000)
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
  mixins: [utils],
}
</script>

<template>
  <div :style="cardStyle" :class="cardClasses">
    <!-- Tinted icon square -->
    <div
      class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm"
      :class="[iconTint.bg, iconTint.fg]"
      :title="props.data?.component"
    >
      <ExclamationTriangleIcon v-if="hasError" class="w-4 h-4" />
      <template v-else>{{ iconLetter }}</template>
    </div>

    <!-- Title / subtitle / status row -->
    <div class="flex-1 min-w-0 text-left">
      <div class="flex items-center gap-1.5">
        <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" :title="props.data?.label || props.id">
          {{ props.data?.label || props.id }}
        </div>
        <span class="dot" v-if="props.data?.emitter" :class="props.data?.emitting ? 'emitting' : (props.data?.emit ? 'emit' : 'stop')"></span>
      </div>
      <div v-if="props.data?.component" class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
        {{ props.data.component }}
      </div>
      <div
        v-if="props.data?.trace && props.data.trace.sequence >= 0"
        class="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-1"
        :title="'Span# ' + props.data.trace.sequence"
      >
        {{ props.data.trace.port }}: {{ msToTime(props.data.trace.latency) }}
      </div>
      <div v-if="props.data?.['shared_with_flows'] || props.data?.dashboard === 'true' || props.data?.comment" class="flex items-center gap-1 mt-1.5">
        <span
          v-if="props.data?.['shared_with_flows']"
          class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded p-0.5 inline-flex"
          title="Shared node"
        >
          <GlobeAltIcon class="w-3 h-3" />
        </span>
        <span
          v-if="props.data?.dashboard === 'true'"
          class="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 rounded p-0.5 inline-flex"
          title="Added to dashboard"
        >
          <AdjustmentsHorizontalIcon class="w-3 h-3" />
        </span>
        <span v-if="props.data?.comment" class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
          {{ props.data.comment }}
        </span>
      </div>
    </div>
  </div>

  <template v-if="!props.noExpire">
    <InlineOverlay :mini="true" v-if="(props.data?.handles || []).length === 0 || loading">Loading</InlineOverlay>
  </template>

  <template v-for="h in props.data?.handles || []" :key="h.id">
    <Handle
      v-if="!h.id?.startsWith('_')"
      :title="h.error ? h.error : (h.label || h.id)"
      :id="h.id"
      :type="h.type"
      :position="posIntToStr(h.rotated_position)"
      :style="calculateHandlerStyle(h, props.data)"
      :class="['border', calculateHandlerClass(h, props.data)]"
    >
      <span class="px-1 text-[10px] tracking-tight">{{ h.label }}</span>
    </Handle>
  </template>
</template>
