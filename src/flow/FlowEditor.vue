<script>
import {ConnectionMode, isEdge, isNode, useVueFlow, VueFlow} from '@vue-flow/core'
import {ControlButton, Controls} from '@vue-flow/controls'
import {MiniMap} from '@vue-flow/minimap'
import {Background} from '@vue-flow/background'

import {PlusCircleIcon, RectangleGroupIcon} from '@heroicons/vue/24/outline'
import {LockClosedIcon, LockOpenIcon} from '@heroicons/vue/24/solid'
import TinyNode from '../canvas/TinyNode.vue';
import TinyEdge from "../canvas/TinyEdge.vue";
import RotateIcon from '../support/RotateIcon.vue'
import InlineOverlay from '../canvas/InlineOverlay.vue'
// @ts-ignore
import {useFlowStore} from '../store/flow'
import {useLayout} from '../support/useLayout'
import {nextTick, onMounted, onUnmounted, onUpdated, ref, watch} from 'vue';

export default {
  emits: ['addNode', 'configureEdge', 'deleteNode', 'deleteEdge'],
  components: {
    Background,
    VueFlow,
    Controls,
    ControlButton,
    PlusCircleIcon,
    RectangleGroupIcon,
    LockClosedIcon,
    LockOpenIcon,
    RotateIcon,
    InlineOverlay,
    MiniMap,
    TinyNode,
    TinyEdge
  },
  setup(props, { emit }) {
    const store = useFlowStore()
    const { layout } = useLayout()
    const positionBefore = ref({})
    const paneIsReady = ref(false)
    const {
      onConnect,
      addEdges,
      onPaneReady,
      onNodesChange,
      onEdgesChange,
      onNodeDragStop,
      onNodeDragStart,
      viewport,
      dimensions,
      setViewport,
      fitView
    } = useVueFlow()

    //@ts-ignore
    const moveEnd = (event) => {
      store.setMeta(event.flowTransform)
      store.saveMeta()
    }

    // Helper to apply viewport when ready
    const applyViewportFromMeta = () => {
      if (store.meta && store.meta.x !== undefined && store.meta.y !== undefined && store.meta.zoom !== undefined) {
        setViewport(store.meta)
        return true
      }
      return false
    }

    onPaneReady(i => {
      setTimeout(() => {
        paneIsReady.value = true
        store.ready = true
        // Try to apply viewport immediately if meta is already loaded
        applyViewportFromMeta()
      }, 200)
    })

    // Watch for meta changes to apply viewport if pane was ready before meta loaded
    watch(() => store.meta, (newMeta) => {
      if (paneIsReady.value && newMeta) {
        applyViewportFromMeta()
      }
    }, { deep: true })

    const onRotateHandler = async () => {
      await store.rotate()
    }

    const onAutoLayoutHandler = async () => {
      // Separate nodes and edges
      const nodes = store.elements.filter(el => isNode(el))
      const edges = store.elements.filter(el => isEdge(el))

      // Apply dagre layout
      const layoutedNodes = layout(nodes, edges, 'LR')

      // Update store elements with new positions
      store.elements = [
        ...layoutedNodes,
        ...edges
      ]

      // Wait for Vue to update, then fit view and save
      await nextTick()
      fitView({ padding: 0.2 })

      // Save the new positions
      await store.save()
    }

    onConnect(params => {
        if (store.readOnly) return
        const data = {
          'configuration': null
        }

        const target = store.getElement(params.target)

        if (target && target.data) {
          // @ts-ignore
          const source = store.getElement(params.source)
          if (target.data.blocked && source && source.data.blocked) {
            return
          }

          // @ts-ignore
          const otherEdge = store.elements.find(h => h.target === params.target && h.targetHandle === params.targetHandle && h.source !== params.source && h.sourceHandle !== params.sourceHandle && isEdge(h))

          if (otherEdge && otherEdge.data) {
            data['configuration'] = otherEdge.data['configuration']
            // @ts-ignore
            data['schema'] = otherEdge.data['schema']
          } else {
            // @ts-ignore
            const targetHandle = target.data.handles.find(h => h.id === params.targetHandle)
            if (targetHandle) {
              data['configuration'] = targetHandle['configuration']
              // @ts-ignore
              data['schema'] = targetHandle['schema']
            }
          }
        } else {
          return
        }
        addEdges([
          {
            type: 'tinyEdge',
            data: data,
            hidden: true,
            ...params,
          }
        ])
      }
    )
    // Removed onNodesChange and onEdgesChange handlers for removal events
    // Deletion is now handled via confirmation dialog triggered by keyboard events
    // See FlowPage.vue for the delete confirmation logic

    onEdgesChange(changes => {
      // Only handle non-removal changes
      const hasRemovals = changes.some(c => c.type === 'remove')
      if (hasRemovals) {
        // Removals are now handled via confirmation dialog
        return
      }
      if (changes.filter(a => a.type !== 'select').length === 0) {
        return
      }
      store.up()
    })

    onNodeDragStart( (e) => {
      positionBefore.value = e.node.position
    })

    onNodeDragStop((a) => {
      if (store.readOnly) return
      if (positionBefore.value !== a.node.position) {
        store.up()
      }
    })

    // Handle Delete key press - emit event to show confirmation dialog
    const handleKeyDown = (event) => {
      // Skip if user is typing in an input or textarea
      const tagName = event.target.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || event.target.isContentEditable) {
        return
      }

      if (store.readOnly) return

      // Cmd/Ctrl+C: copy selected nodes
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        if (store.selectedNodes.length > 0) {
          event.preventDefault()
          store.copySelected().catch(console.error)
        }
        return
      }

      // Cmd/Ctrl+V: paste nodes from clipboard
      if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
        event.preventDefault()
        store.pasteFromClipboard().catch(console.error)
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()

        // Check if a node is selected
        if (store.selectedNode) {
          emit('deleteNode', store.selectedNode)
          return
        }

        // Check if an edge is selected
        if (store.selectedEdge) {
          emit('deleteEdge', store.selectedEdge)
          return
        }
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown)
    })

    onUpdated(() => {
    })
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      store.clean()
    })
    return {
      moveEnd,
      ConnectionMode,
      onPaneReady,
      onRotateHandler,
      onAutoLayoutHandler,
      store,
      props,
      viewport,
      dimensions
    }
  },
}
</script>
<template>
  <div class="relative w-full h-full">
    <InlineOverlay v-if="!store.ready || store.loading">Loading...</InlineOverlay>
    <div :class="['w-full h-full z-0 text-white min-h-10']">
      <VueFlow v-model="store.elements" :connection-mode="ConnectionMode.Strict" :default-zoom="1.0" :delete-key-code="null" @move-end="moveEnd" @pane-ready="onPaneReady" :min-zoom="0.5" :max-zoom="1" :nodes-draggable="!store.readOnly" :nodes-connectable="!store.readOnly" :class="[!store.ready ? 'flow-hidden' : '']">
        <template #node-tinyNode="props">
          <TinyNode v-bind="props"/>
        </template>
        <template #edge-tinyEdge="props">
          <TinyEdge v-bind="props" :curvature="0.4" @configureEdge="id =>$emit('configureEdge', id)"/>
        </template>
        <Background variant="dots" pattern-color="#94a3b8" :gap="22" :size="1.6" class="hide-on-screenshot"/>
        <MiniMap class="hidden xl:block" pannable/>
        <Controls class="hide-on-screenshot">
          <template #top="props">
            <ControlButton class="vue-flow__controls-rotate" @click="onRotateHandler" v-if="store.selectedNode && !store.readOnly" title="Rotate node">
              <RotateIcon/>
            </ControlButton>
          </template>
        </Controls>
        <!-- Lock-aware edit toggle -->
        <button v-if="store.ready"
          @click="store.toggleLock()"
          :disabled="store.lockAcquiring"
          :title="store.lockAcquiring ? 'Acquiring lock...' : store.lockError ? store.lockError : store.readOnly ? 'Switch to editing mode' : 'Release editing lock'"
          :class="[
            'hide-on-screenshot',
            store.lockAcquiring
              ? 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 cursor-wait'
              : store.lockError
                ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700'
                : store.readOnly
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700'
                  : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
          ]"
          style="position: absolute; top: 20px; right: 60px; z-index: 1000; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; border-width: 1px; font-size: 12px; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
        >
          <LockClosedIcon v-if="store.readOnly" style="height: 16px; width: 16px;" />
          <LockOpenIcon v-else style="height: 16px; width: 16px;" />
          {{ store.lockAcquiring ? 'ACQUIRING...' : store.readOnly ? 'READ ONLY' : 'EDITING' }}
        </button>
        <!-- Lock holder info badge -->
        <div v-if="store.lockHolder && store.readOnly && (store.lockHolder.FirstName || store.lockHolder.Email)"
          class="hide-on-screenshot bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-300 dark:border-red-700"
          style="position: absolute; top: 56px; right: 60px; z-index: 1000; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 500;"
        >
          Editing: {{ store.lockHolder.FirstName }} {{ store.lockHolder.LastName }}
        </div>
        <PlusCircleIcon v-if="store.ready && !store.readOnly" @click="$emit('addNode', {x: dimensions.width/2 - viewport.x, y: dimensions.height/2 - viewport.y})"
                        style="position: absolute; top: 20px; right: 20px; z-index: 1000; height: 30px; cursor: pointer" class="text-indigo-600 hide-on-screenshot"></PlusCircleIcon>
      </VueFlow>
    </div>
  </div>
</template>
<style>
/* Dark mode: use .dark class (Tailwind class-based) for app toggle compatibility */
.dark .vue-flow .vue-flow__minimap {
  background-color: #333;
}
.dark .vue-flow .vue-flow__minimap rect {
  fill: #222;
}
.dark .vue-flow .vue-flow__minimap-mask {
  fill: #111;
  opacity: 0.6;
}
.dark .vue-flow .vue-flow__minimap-node {
  fill: #60a5fa;
  stroke: #3b82f6;
  stroke-width: 1px;
}
.dark .vue-flow .vue-flow__node {
  background: transparent;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.dark .vue-flow__background {
  opacity: 0.3;
}
.dark .vue-flow__edge-path {
  stroke: #555;
}
.dark .vue-flow__edge button {
  color: #666;
}

.dark .vue-flow .vue-flow__controls, .dark .vue-flow .vue-flow__controls-button {
  background-color: #333;
  color: #ccc;
  border-color: #444;
}

.dark .vue-flow .vue-flow__controls-button:hover {
  background-color: #888;
}
.dark .vue-flow .vue-flow__controls-button:last-child {
  border: none;
}

.dark .vue-flow .vue-flow__controls-button svg {
  fill: #ccc;
}

.vue-flow .vue-flow__controls-button svg {
  fill: #333;
}

.vue-flow__node {
  background: transparent;
  border: none;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.vue-flow__node.selected {
  background: transparent;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dark .vue-flow__node.selected {
  background: transparent;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2), 0 1px 3px rgba(0, 0, 0, 0.3);
}

.vue-flow__edge path {
  stroke: #ccc;
}
.vue-flow__edge.animated path {

}
.flow-hidden .vue-flow__transformationpane {
  opacity: 0;
}
 .vue-flow__handle {
   font-size: small;
 }
</style>
