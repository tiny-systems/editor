<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="inline-flex items-center gap-1 text-lg leading-tight font-medium text-gray-900 dark:text-gray-300 px-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
    >
      <span class="truncate max-w-64">{{ currentFlowName }}</span>
      <ChevronDownIcon class="w-4 h-4 flex-shrink-0" />
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="absolute left-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto origin-top-left rounded-lg shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none bg-white dark:bg-gray-900"
      >
        <div class="p-2 pb-6">
          <div v-if="loading" class="text-center py-4 text-sm text-gray-500">
            Loading flows...
          </div>
          <div v-else-if="flows.length === 0" class="text-center py-4 text-sm text-gray-500">
            No other flows
          </div>
          <div v-else class="space-y-3">
            <MenuItem v-for="flow in flows" :key="getFlowId(flow)" v-slot="{ active }">
              <button
                @click="switchToFlow(flow)"
                :class="[
                  'w-full rounded-md transition-colors',
                  active ? 'bg-gray-100 dark:bg-gray-800' : '',
                  isCurrentFlow(flow) ? 'ring-2 ring-indigo-500' : ''
                ]"
              >
                <div class="flex flex-col">
                  <!-- Flow preview -->
                  <div
                    class="h-28 w-full overflow-hidden rounded-t-md bg-gray-100 dark:bg-gray-800"
                  >
                    <FlowPreview
                      v-if="flow.graph && hasNodes(flow.graph)"
                      :graph="flow.graph"
                      :id="'switcher-' + getFlowId(flow)"
                    />
                    <div v-else class="h-full flex items-center justify-center text-gray-400 text-xs">
                      No preview
                    </div>
                  </div>
                  <!-- Flow info -->
                  <div class="px-3 py-2 text-left bg-gray-50 dark:bg-gray-800/50 rounded-b-md">
                    <div
                      :class="[
                        'text-sm font-medium truncate',
                        isCurrentFlow(flow) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-200'
                      ]"
                    >
                      {{ getFlowName(flow) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      Rev: {{ getFlowRevision(flow) }}
                    </div>
                  </div>
                </div>
              </button>
            </MenuItem>
          </div>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '../support/nav'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import FlowPreview from '../canvas/FlowPreview.vue'
import { useEditorClient } from '../store/client'

const props = defineProps({
  currentFlow: {
    type: Object,
    required: true
  },
  projectResourceName: {
    type: String,
    required: true
  },
  workspaceSlug: {
    type: String,
    required: true
  }
})

const client = useEditorClient()

const flows = ref([])
const loading = ref(false)

const currentFlowName = computed(() => {
  return props.currentFlow?.Name || props.currentFlow?.name || ''
})

const currentFlowResourceName = computed(() => {
  return props.currentFlow?.ResourceName || props.currentFlow?.resourcename || ''
})

const getFlowId = (flow) => {
  return flow?.ResourceName || flow?.resourcename || flow?.ID || flow?.id || ''
}

const getFlowName = (flow) => {
  return flow?.Name || flow?.name || ''
}

const getFlowRevision = (flow) => {
  return flow?.Revision || flow?.revision || 0
}

const getFlowResourceName = (flow) => {
  return flow?.ResourceName || flow?.resourcename || ''
}

const isCurrentFlow = (flow) => {
  return getFlowResourceName(flow) === currentFlowResourceName.value
}

const hasNodes = (graph) => {
  const nodes = graph?.nodes || graph?.elements?.filter(e => e.type === 'tinyNode') || []
  return nodes.length > 0
}

// Parse flow graph from bytes (same logic as project page)
const parseFlowGraph = (flowItem) => {
  const flow = flowItem?.Flow || flowItem?.flow || flowItem
  if (!flow) return null

  let graph = null
  const graphBytes = flow.Graph || flow.graph
  if (graphBytes && graphBytes.length > 0) {
    try {
      const graphStr = typeof graphBytes === 'string'
        ? graphBytes
        : new TextDecoder().decode(graphBytes)
      graph = JSON.parse(graphStr)
    } catch (e) {
      console.error('Failed to parse flow graph:', e)
    }
  }

  return {
    ID: flow.ID || flow.id,
    Name: flow.Name || flow.name,
    ResourceName: flow.ResourceName || flow.resourcename,
    Revision: flow.Revision || flow.revision || 0,
    graph
  }
}

const loadFlows = async () => {
  if (!props.projectResourceName || !client) return

  loading.value = true
  try {
    const response = await client.flow.getFlowList({
      ProjectName: props.projectResourceName
    })

    // Parse graph for each flow to enable previews
    const flowList = response?.Flows || []
    const parsedFlows = []
    for (const flowItem of flowList) {
      const parsed = parseFlowGraph(flowItem)
      if (parsed) {
        parsedFlows.push(parsed)
      }
    }
    flows.value = parsedFlows
  } catch (err) {
    console.error('Failed to load flows:', err)
    flows.value = []
  } finally {
    loading.value = false
  }
}

const switchToFlow = (flow) => {
  if (isCurrentFlow(flow)) return

  const resourceName = getFlowResourceName(flow)
  if (resourceName) {
    navigateTo(`/${props.workspaceSlug}/project-${props.projectResourceName}/flow-${resourceName}`)
  }
}

// Load flows when component mounts
onMounted(() => {
  loadFlows()
})

// Reload if project changes
watch(() => props.projectResourceName, () => {
  loadFlows()
})
</script>
