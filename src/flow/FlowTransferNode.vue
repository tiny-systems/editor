<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="relative z-10" @close="$emit('close')">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-black dark:border dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
            <form @submit.prevent="transferNodes()">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CheckIcon class="h-6 w-6 text-green-600" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    <template v-if="store.selectedNodes.length > 1">
                      Transfer {{ store.selectedNodes.length }} nodes to another flow
                    </template>
                    <template v-else>
                      Transfer node {{ store.selectedNode?.data?.label }} to another flow
                    </template>
                  </DialogTitle>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Connected nodes will be automatically shared with the destination flow.
                  </p>
                  <div class="mt-2">
                    <div class="flex items-center justify-between mb-1">
                      <label for="transferToFlow" class="text-left block text-sm text-gray-500 dark:text-gray-400">Destination Flow</label>
                      <button
                        v-if="!showNewFlowInput"
                        @click="openNewFlowInput"
                        type="button"
                        class="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        <PlusIcon class="w-3.5 h-3.5" />
                        <span>New Flow</span>
                      </button>
                    </div>

                    <!-- New flow input -->
                    <div v-if="showNewFlowInput" class="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 text-left">Flow Name</label>
                      <div class="flex gap-2">
                        <input
                          ref="newFlowInputRef"
                          v-model="newFlowName"
                          type="text"
                          placeholder="New flow name"
                          @keydown.enter.prevent="createNewFlow"
                          @keydown.escape="cancelNewFlow"
                          class="flex-1 border-gray-300 dark:border-gray-600 placeholder-gray-400 focus:ring-indigo-600 focus:border-indigo-600 appearance-none border rounded py-2 px-3 text-gray-700 leading-tight sm:text-sm dark:bg-gray-900 dark:text-gray-300"
                        />
                        <button
                          @click="createNewFlow"
                          :disabled="!newFlowName.trim() || creatingFlow"
                          type="button"
                          class="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {{ creatingFlow ? '...' : 'Create' }}
                        </button>
                        <button
                          @click="cancelNewFlow"
                          type="button"
                          class="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <select v-model="transferToFlowResourceName" id="transferToFlow" class="mt-1 border-indigo-600 placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300">
                      <option value="" disabled>Select a flow...</option>
                      <option
                        v-for="f in filteredFlows"
                        :key="f.ResourceName || f.resourcename"
                        :value="f.ResourceName || f.resourcename"
                      >
                        {{ f.Name || f.name }}
                      </option>
                    </select>

                    <!-- No flows message -->
                    <div v-if="filteredFlows.length === 0 && !showNewFlowInput" class="text-gray-500 text-sm py-2 mt-2 text-center">
                      No other flows available. Create a new one above.
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="$emit('close')" type="button"
                        class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                  Cancel
                </button>
                <button type="submit" :disabled="!transferToFlowResourceName" :class="[transferToFlowResourceName ? 'text-white bg-indigo-600 hover:bg-indigo-800 focus:ring-4' : 'text-indigo-500 bg-indigo-200 focus:ring-4 cursor-not-allowed', 'focus:outline-none focus:ring-indigo-300 dark:focus:ring-indigo-800 font-medium rounded-lg text-sm items-center px-5 py-2 text-center']">
                  Transfer
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
<script setup>
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot
} from '@headlessui/vue'

import { computed, ref, nextTick, watch } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/solid'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { useFlowStore } from '../store/flow'
import { useEditorClient } from '../store/client'
import { notify } from 'notiwind'

const props = defineProps({
  allFlows: {
    type: Array,
    default: () => []
  },
  currentFlow: {
    type: Object,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
})

const client = useEditorClient()
const store = useFlowStore()
const transferToFlowResourceName = ref('')
const emit = defineEmits(['close', 'flowCreated'])

// New flow creation state
const showNewFlowInput = ref(false)
const newFlowName = ref('')
const creatingFlow = ref(false)
const newFlowInputRef = ref(null)
const pendingFlowSelection = ref('') // Track flow name to auto-select after creation

// Filter out current flow from the list and unwrap FlowListItem to Flow
const filteredFlows = computed(() => {
  const currentResourceName = props.currentFlow?.ResourceName || props.currentFlow?.resourcename
  return (props.allFlows || [])
    .map(f => f.Flow || f)
    .filter(flow => {
      const flowResourceName = flow.ResourceName || flow.resourcename
      return flowResourceName !== currentResourceName
    })
})

// Auto-select newly created flow when it appears in the list
watch(filteredFlows, (newFlows) => {
  if (pendingFlowSelection.value) {
    const newFlow = newFlows.find(f => {
      const name = f.Name || f.name
      return name === pendingFlowSelection.value
    })
    if (newFlow) {
      transferToFlowResourceName.value = newFlow.ResourceName || newFlow.resourcename
      pendingFlowSelection.value = ''
    }
  }
})

const openNewFlowInput = () => {
  showNewFlowInput.value = true
  newFlowName.value = ''
  nextTick(() => {
    newFlowInputRef.value?.focus()
  })
}

const cancelNewFlow = () => {
  showNewFlowInput.value = false
  newFlowName.value = ''
}

const createNewFlow = async () => {
  if (!newFlowName.value.trim()) return

  creatingFlow.value = true
  const flowName = newFlowName.value.trim()
  pendingFlowSelection.value = flowName // Track for auto-selection after reload
  try {
    const req = {
      Name: flowName,
      ProjectID: store.projectID
    }

    await client.flow.createFlow(req)

    // Reload flows list to get the newly created flow
    emit('flowCreated')

    showNewFlowInput.value = false
    newFlowName.value = ''
  } catch (e) {
    pendingFlowSelection.value = '' // Clear on error
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'Failed to create flow'
    }, 99999)
  } finally {
    creatingFlow.value = false
  }
}

const transferNodes = async () => {
  if (!transferToFlowResourceName.value) return

  store.loading = true

  // Get selected node IDs
  const selectedNodeNames = store.selectedNodes.map(f => f.id)

  try {
    await client.flow.transferNodes({
      FromFlowName: props.currentFlow.ResourceName || props.currentFlow.resourcename,
      ToFlowName: transferToFlowResourceName.value,
      Nodes: selectedNodeNames,
      ProjectName: store.projectResourceName
    })
    emit('close')
  } catch (e) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 99999)
  } finally {
    store.loading = false
  }
}
</script>
