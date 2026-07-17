<template>
  <div class="flow-preview-container">
    <VueFlow :id="id" :edges="graph?.edges || []" :nodes="graph?.nodes || []" :elementsSelectable="false"
             :selectNodesOnDrag="false"
             fit-view-on-init
             :min-zoom="0.05"
             :max-zoom="1.5"
             :panOnDrag="interactive" :zoomOnScroll="false" :zoomOnPinch="interactive" :zoomOnDoubleClick="interactive"
             :panOnScroll="interactive" panOnScrollMode="free"
             :preventScrolling="interactive"
             :nodesDraggable="false" :edgesUpdatable="false" :nodesConnectable="false"
             :class="interactive ? '' : 'pointer-events-none'"
             @node-click="(e) => emit('node-click', e.node)">
      <template #node-tinyNode="props">
        <TinyNode v-bind="props" :no-expire="true"/>
      </template>
      <template #edge-tinyEdge="props">
        <TinyEdge v-bind="props" :curvature="0.4" no-configure/>
      </template>
      <Controls v-if="interactive" :show-interactive="false" />
      <slot></slot>
    </VueFlow>
  </div>
</template>
<script setup>
import TinyEdge from './TinyEdge.vue';
import TinyNode from './TinyNode.vue';
import {VueFlow} from '@vue-flow/core'
import {Controls} from '@vue-flow/controls'

// `interactive` opts into a navigable viewport (pan + zoom + zoom
// controls) while keeping the NODES read-only (non-draggable, non-
// selectable). Default false preserves the static-thumbnail behaviour
// every other caller relies on.
const props = defineProps({
  graph: {},
  id: '',
  interactive: { type: Boolean, default: false },
})

// Nodes render with a pointer cursor (shared TinyNode) but the preview
// has no node UI of its own — surface clicks so the host can respond
// (the playground jumps to the node's Inputs widget). Non-interactive
// thumbnails have pointer-events-none, so this never fires there.
const emit = defineEmits(['node-click'])
</script>

<style scoped>
.flow-preview-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.flow-preview-container :deep(.vue-flow) {
  width: 100%;
  height: 100%;
}
</style>
