<script setup>
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'
import utils from "./utils";

const props = defineProps({
  disabled: {
    type: Boolean,
  },
  noConfigure: {
    type: Boolean
  },
  selected: {
    type: Boolean
  },
  id: {
    type: String,
    required: true,
  },
  sourceX: {
    type: Number,
    required: true,
  },
  sourceY: {
    type: Number,
    required: true,
  },
  targetX: {
    type: Number,
    required: true,
  },
  targetY: {
    type: Number,
    required: true,
  },
  sourcePosition: {
    type: String,
    required: true,
  },
  targetPosition: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: false,
  },
  markerEnd: {
    type: String,
    required: false,
  },
  curvature: {
    type: Number,
    required: false
  },
  style: {
    type: Object,
    required: false,
  },
})
const emits = defineEmits(['configureEdge'])
const { addSelectedEdges, findEdge } = useVueFlow()
// Orthogonal step routing with a soft 12px corner radius gives the
// clean right-angle look the design references use without losing the
// "smooth bend" feel at corners.
const path = computed(() => getSmoothStepPath({ ...props, borderRadius: 12 }))

// Highlight the selected trace's execution path: an edge that carried data in
// the trace has data.trace — draw it in indigo with a soft glow (on top of the
// backend's rate-based strokeWidth) so the path the request actually took pops
// out of the graph.
const edgeStyle = computed(() => {
  const s = { ...(props.style || {}) }
  if (props.data?.trace) {
    s.stroke = '#6366f1'
    s.strokeWidth = Math.max(Number(s.strokeWidth) || 0, 2.5)
    s.filter = 'drop-shadow(0 0 2.5px rgba(99,102,241,0.65))'
  }
  return s
})
</script>

<script>
export default {
  inheritAttrs: false,
  mixins: [utils]
}
</script>

<template>
  <BaseEdge :id="id" :style="edgeStyle" :path="path[0]" :marker-end="markerEnd"/>
  <EdgeLabelRenderer>
    <div v-if="props.data && !props.data.blocked" :style="{
        pointerEvents: 'all',
        position: 'absolute',
        color: 'black',
        textAlign: 'center',
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }" class="nodrag nopan">
      <button v-if="!noConfigure" @click="addSelectedEdges([findEdge(props.id)])" :title="props.data?.error || props.data?.warning || 'Configure'">
        <PencilSquareIcon :class="[
          'w-5 h-5',
          (props.data?.error || !props.data?.valid)
            ? 'fill-red-500 stroke-red-200 dark:fill-red-700 dark:stroke-red-300 dark:opacity-70'
            : props.data?.warning
              ? 'fill-amber-400 stroke-amber-200 dark:fill-amber-600 dark:stroke-amber-300 dark:opacity-80'
              : (!props.selected
                ? 'fill-gray-200 text-gray-400 dark:text-gray-300 dark:fill-gray-900 dark:opacity-40'
                : 'fill-indigo-500 stroke-indigo-200 dark:fill-indigo-700 dark:stroke-indigo-300 dark:opacity-70')
        ]"></PencilSquareIcon>
      </button>
      <div class="text-xs w-full text-center text-indigo-500" v-if="props.data?.trace && props.data.trace.sequence > 0" :title="'Span# ' + props.data.trace.sequence">
        {{msToTime(props.data.trace.latency)}}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>
