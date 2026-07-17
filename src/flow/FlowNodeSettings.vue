<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="relative z-10" @close="$emit('close')">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-black dark:border dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
            <form @submit.prevent="saveSelectedNode()">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CogIcon class="h-6 w-6 text-green-600" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" v-if="selectedNode">{{ selectedNode.data.label }}</DialogTitle>
                  <div class="mt-2 text-left">
                    <label class="dark:text-gray-500 whitespace-nowrap">
                      <input type="checkbox" v-model="sharedToggle"
                             title="Shared"
                             class="w-4 h-4 my-3 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-800 dark:border-gray-600"/><span
                      class="hidden md:inline-block text-sm pl-1 pr-2">Shared node</span>
                    </label>
                    <p class="text-xs dark:text-gray-300">Shared nodes are accessible across selected flows of the project.</p>
                  </div>
                  <div class="mt-2 text-left" v-if="sharedToggle">
                    <label for="transferToFlow" class="text-left block text-sm text-gray-500">Shared with other flows</label>
                    <!-- Show select only if there are other flows -->
                    <select v-if="filteredFlows.length > 0" id="transferToFlow" v-model="sharedFlows" name="flows[]" multiple class="mt-1 border-indigo-600 placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300">
                      <option :key="f.ResourceName || f.resourcename" :value="f.ResourceName || f.resourcename" v-for="f in filteredFlows">{{ f.Name || f.name }}</option>
                    </select>
                    <!-- No other flows message -->
                    <p v-else class="mt-1 text-xs text-gray-400 dark:text-gray-500 py-3">No other flows in this project.</p>
                    <!-- New flow button -->
                    <button
                      type="button"
                      @click="showNewFlowDialog = true"
                      class="mt-2 inline-flex items-center text-sm text-indigo-500 hover:text-indigo-600"
                    >
                      <PlusIcon class="w-4 h-4 mr-1" />
                      New flow
                    </button>
                  </div>

                  <div class="mt-2 text-left dark:text-white text-sm" v-if="selectedNode.data.handles.find(h => h.id === '_control')">
                    <label class="dark:text-gray-500 whitespace-nowrap">
                      <input type="checkbox" :checked="selectedNode.data.dashboard === 'true'"
                             @change="dashboard = $event.target.checked? 'true' : 'false'"
                             title="Add to dashboard"
                             class="w-4 h-4 my-3 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-800 dark:border-gray-600"/><span
                      class="hidden md:inline-block text-sm pl-1 pr-2">Add to dashboard</span>
                    </label>
                    <p class="text-xs dark:text-gray-300">Display control port form on the project's dashboard.</p>
                  </div>
                  <div class="mt-2 text-left">
                    <a href="#" @click.prevent="advancedSettings = !advancedSettings" class="text-sm text-indigo-500 py-2">
                      <ChevronDownIcon class="w-4 h-4 inline-block" v-if="!advancedSettings"/>
                      <ChevronUpIcon class="w-4 h-4 inline-block" v-else/>
                      Advanced settings</a>
                    <div v-if="advancedSettings">
                      <div class="mt-2">
                        <label for="moduleName" class="block text-xs font-medium text-indigo-500">Module name</label>
                        <div class="mt-1 relative">
                          <input id="moduleName" v-model="moduleName" name="moduleName" :required="true"
                                 class="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:shadow-none"/>
                        </div>
                      </div>
                      <div class="mt-2">
                        <label for="componentName" class="block text-xs font-medium text-indigo-500">Component name</label>
                        <div class="mt-1 relative">
                          <input id="componentName" v-model="componentName" name="componentName" :required="true"
                                 class="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:shadow-none"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="$emit('close')" type="button"
                        class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                  Cancel
                </button>
                <button type="submit" class="text-white bg-indigo-600 hover:bg-indigo-800 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:focus:ring-indigo-800 font-medium rounded-lg text-sm items-center px-5 py-2 text-center">
                  Save
                </button>
              </div>
            </form>

            <!-- New Flow Dialog (overlay) -->
            <div v-if="showNewFlowDialog" class="absolute inset-0 bg-white dark:bg-black rounded-lg flex flex-col p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Create New Flow</h3>
                <button type="button" @click="showNewFlowDialog = false" class="text-gray-400 hover:text-gray-500">
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>
              <form @submit.prevent="createNewFlow" class="flex-1">
                <div>
                  <label for="newFlowName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Flow name</label>
                  <input
                    id="newFlowName"
                    ref="newFlowNameInput"
                    v-model="newFlowName"
                    type="text"
                    :class="{ 'border-red-500': newFlowNameError }"
                    class="mt-1 border-indigo-500 placeholder-gray-400 appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm dark:bg-gray-900 dark:text-gray-300"
                    placeholder="Enter flow name"
                  />
                  <p v-if="newFlowNameError" class="mt-1 text-xs text-red-500">Flow name is required</p>
                </div>
                <div class="mt-4 flex gap-3">
                  <button
                    type="button"
                    @click="showNewFlowDialog = false"
                    class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="creatingFlow"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {{ creatingFlow ? 'Creating...' : 'Create' }}
                  </button>
                </div>
              </form>
            </div>
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

import {CogIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon} from '@heroicons/vue/24/outline';
import {useFlowStore} from '../store/flow';
import {useEditorClient} from '../store/client';
import {ref, computed, watch, nextTick} from 'vue';
import {notify} from 'notiwind';

const props = defineProps({
  selectedNode: null,
  allFlows: null,
  currentFlow: null,
  projectId: null
})


const store = useFlowStore()
const emits = defineEmits(['close', 'flowsUpdated'])
const client = useEditorClient()

// New flow dialog state
const showNewFlowDialog = ref(false)
const newFlowName = ref('')
const newFlowNameError = ref(false)
const creatingFlow = ref(false)
const newFlowNameInput = ref(null)

// Watch for dialog open to focus input
watch(showNewFlowDialog, async (show) => {
  if (show) {
    newFlowName.value = ''
    newFlowNameError.value = false
    await nextTick()
    newFlowNameInput.value?.focus()
  }
})

// Watch name input to clear error
watch(newFlowName, () => {
  newFlowNameError.value = false
})

// Create new flow
const createNewFlow = async () => {
  if (!newFlowName.value.trim()) {
    newFlowNameError.value = true
    return
  }

  creatingFlow.value = true
  try {
    const flowName = newFlowName.value.trim()
    const req = {
      Name: flowName,
      ProjectID: props.projectId
    }

    const response = await client.flow.createFlow(req)

    // Add the new flow to local list immediately
    if (response?.Flow) {
      localFlows.value = [...localFlows.value, response.Flow]
    }

    notify({
      group: "generic",
      title: "Success",
      text: "Flow created successfully!"
    }, 5000)

    showNewFlowDialog.value = false
    newFlowName.value = ''

    // Emit event to refresh flows list in parent (for persistence)
    emits('flowsUpdated')
  } catch (e) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'Failed to create flow'
    }, 99999)
  } finally {
    creatingFlow.value = false
  }
}

// Local copy of flows that can be updated when new flow is created
const localFlows = ref([...(props.allFlows || [])])

// Watch for prop changes to sync local copy
watch(() => props.allFlows, (newFlows) => {
  localFlows.value = [...(newFlows || [])]
}, { deep: true })

// Filter out current flow from the list and unwrap FlowListItem to Flow
const filteredFlows = computed(() => {
  const currentResourceName = props.currentFlow?.ResourceName || props.currentFlow?.resourcename
  return localFlows.value
    .map(f => f.Flow || f)
    .filter(flow => {
      const flowResourceName = flow.ResourceName || flow.resourcename
      return flowResourceName !== currentResourceName
    })
})

const dashboard = ref(props.selectedNode.data.dashboard)

//
const newShared = ref(null)
const advancedSettings = ref(false)

const sharedFlows = computed({
  get() {
    if (newShared.value) {
      return newShared.value
    }
    const flows = props.selectedNode.data['shared_with_flows']
    if (flows === undefined || flows === '') {
      return []
    }
    // Filter out empty strings that may result from trailing commas or empty entries
    return flows.split(',').filter(f => f && f.trim())
  },
  set(val) {
    newShared.value = val
  }
})

const shared = ref(null)

const sharedToggle = computed( {
  get() {
    if (shared.value !== null) {
      return shared.value
    }
    return sharedFlows.value.length > 0
  },
  set(val) {
    shared.value = val
  }
})

const componentName = ref(props.selectedNode.data.component)
const moduleName = ref(props.selectedNode.data.module)

const doSave = () => {
  store.save().catch(e => {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 99999)
  })
}

const saveSelectedNode = () => {
  let copy = Object.assign({}, props.selectedNode)

  if (sharedToggle.value) {
    copy.data['shared_with_flows'] = (sharedFlows.value || []).join(',')
  } else {
    copy.data['shared_with_flows'] = ''
  }

  copy.data.dashboard = dashboard.value
  copy.data.component = componentName.value
  copy.data.module = moduleName.value

  store.update(copy)
  doSave()
  emits('close')
}
</script>
