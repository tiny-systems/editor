<template>
  <div class="ts-flow-editor">
    <div class="ts-flow-editor__canvas">
      <FlowPreview :id="flowName" :graph="graph" :interactive="true" @node-click="onNodeClick" />

      <!-- connection / loading banner -->
      <div v-if="store.loading" class="ts-flow-editor__banner">Loading flow…</div>
      <div v-else-if="store.streamError" class="ts-flow-editor__banner ts-flow-editor__banner--error">
        {{ store.streamError }}
      </div>
    </div>

    <!-- inspector: opens when a node is selected -->
    <aside v-if="selectedNode" class="ts-flow-editor__inspector">
      <header class="ts-flow-editor__inspector-head">
        <div class="ts-flow-editor__inspector-title">{{ selectedLabel }}</div>
        <button class="ts-flow-editor__inspector-close" @click="clearSelection" aria-label="Close">×</button>
      </header>

      <div class="ts-flow-editor__inspector-body">
        <div v-if="ports.length" class="ts-flow-editor__ports">
          <div class="ts-flow-editor__section-label">Ports</div>
          <button
            v-for="p in ports"
            :key="p.id"
            class="ts-flow-editor__port"
            :class="{ 'ts-flow-editor__port--source': p.source }"
            @click="selectedPortId = p.id"
          >
            <span class="ts-flow-editor__port-dot" :class="p.source ? 'is-source' : 'is-target'"></span>
            {{ p.label || p.id }}
          </button>
        </div>

        <div v-if="selectedPortSchema" class="ts-flow-editor__schema">
          <div class="ts-flow-editor__section-label">Schema</div>
          <VueJsonPretty :data="selectedPortSchema" :deep="2" />
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { isEdge, isNode } from '@vue-flow/core'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import FlowPreview from './FlowPreview.vue'
import { useFlowStore } from '../store/flow'
import type { EditorClient } from '../store/client'

// FlowEditor is the store-backed editable surface — the shared editor both
// hosts mount. Hand it a transport-bound EditorClient and a flow to open; it
// wires the store, loads the flow, subscribes to the live stream and renders
// the pannable/zoomable canvas with a click-to-inspect panel. The host owns
// only the client (its backend + auth); the editor owns everything else.
const props = defineProps<{
  client: EditorClient
  projectName: string
  flowName: string
}>()

const emit = defineEmits<{
  (e: 'node-click', node: any): void
}>()

const store = useFlowStore()
const selectedPortId = ref<string | null>(null)

// store.elements is a flat node+edge array (vue-flow shape); FlowPreview wants
// them split. Recomputes as the stream mutates elements, so the canvas stays
// live.
const graph = computed(() => ({
  nodes: store.elements.filter((el: any) => isNode(el)),
  edges: store.elements.filter((el: any) => isEdge(el)),
}))

const selectedNode = computed<any>(() => (store as any).selectedNode)
const selectedLabel = computed(() => (store as any).selectedNodeLabel || '')

// Visible ports (private _control/_settings handles filtered out by the store).
const ports = computed<any[]>(() => (store as any).selectedNodeHandles || [])

const selectedPortSchema = computed(() => {
  const port = ports.value.find((p) => p.id === selectedPortId.value)
  if (!port?.schema) return null
  try {
    return typeof port.schema === 'string' ? JSON.parse(port.schema) : port.schema
  } catch {
    return port.schema
  }
})

function onNodeClick(node: any) {
  store.select(node.id)
  selectedPortId.value = null
  emit('node-click', node)
}

function clearSelection() {
  store.selectElement(null)
  selectedPortId.value = null
}

// (Re)open whenever the target flow changes: reset the client, load, stream.
async function open() {
  store.clean()
  store.setGrpcClient(props.client)
  await store.load(props.projectName, props.flowName)
  await store.getStream(props.flowName, props.projectName)
}

watch(
  () => [props.projectName, props.flowName],
  () => { open() },
  { immediate: true },
)

onBeforeUnmount(() => {
  store.clean()
})
</script>

<style scoped>
.ts-flow-editor {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.ts-flow-editor__canvas {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}

.ts-flow-editor__banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  background: rgba(17, 24, 39, 0.85);
  color: #f9fafb;
}

.ts-flow-editor__banner--error {
  background: #b91c1c;
}

.ts-flow-editor__inspector {
  flex: 0 0 320px;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--ts-inspector-bg, #ffffff);
}

.ts-flow-editor__inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.ts-flow-editor__inspector-title {
  font-weight: 600;
  font-size: 14px;
}

.ts-flow-editor__inspector-close {
  border: 0;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}

.ts-flow-editor__inspector-body {
  padding: 12px 14px;
  overflow: auto;
}

.ts-flow-editor__section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  margin: 4px 0 8px;
}

.ts-flow-editor__port {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.ts-flow-editor__port:hover {
  background: rgba(0, 0, 0, 0.05);
}

.ts-flow-editor__port-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex: 0 0 auto;
}

.ts-flow-editor__port-dot.is-source {
  background: #10b981;
}

.ts-flow-editor__port-dot.is-target {
  background: #3b82f6;
}

.ts-flow-editor__schema {
  margin-top: 14px;
  font-size: 12px;
}
</style>
