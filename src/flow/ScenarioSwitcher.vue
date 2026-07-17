<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="inline-flex items-center gap-1 text-sm leading-tight text-gray-600 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      :title="currentLabel"
    >
      <BeakerIcon class="w-4 h-4 flex-shrink-0" />
      <span class="truncate max-w-32">{{ currentLabel }}</span>
      <ChevronDownIcon class="w-3 h-3 flex-shrink-0" />
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
        class="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-lg shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none bg-white dark:bg-gray-900"
      >
        <div class="p-2">
          <!-- Default (no scenario) — only show as fallback when no scenarios exist -->
          <MenuItem v-if="scenarios.length === 0" v-slot="{ active }">
            <button
              @click="selectScenario(null)"
              :class="[
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-gray-100 dark:bg-gray-800' : '',
                !store.scenario ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'
              ]"
            >
              Default (schema mock)
            </button>
          </MenuItem>

          <div v-if="loading" class="text-center py-3 text-sm text-gray-500">
            Loading...
          </div>

          <template v-else-if="scenarios.length > 0">
            <MenuItem v-for="sc in scenarios" :key="sc.ResourceName" v-slot="{ active }">
              <div
                :class="[
                  'flex items-center justify-between px-3 py-2 rounded-md transition-colors',
                  active ? 'bg-gray-100 dark:bg-gray-800' : '',
                  store.scenario === sc.ResourceName ? 'ring-2 ring-indigo-500' : ''
                ]"
              >
                <button
                  @click="selectScenario(sc.ResourceName)"
                  class="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate"
                >
                  {{ sc.Name }}
                  <span class="text-xs text-gray-400 ml-1">{{ sc.PortCount }} ports</span>
                </button>
                <button
                  @click.stop="deleteScenario(sc.ResourceName)"
                  class="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Delete scenario"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </MenuItem>
          </template>

          <!-- Create from trace -->
          <div v-if="store.trace" class="border-t dark:border-gray-700 my-1"></div>
          <MenuItem v-if="store.trace" v-slot="{ active }">
            <button
              @click="createFromTrace"
              :disabled="creating"
              :class="[
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-gray-100 dark:bg-gray-800' : '',
                'text-indigo-600 dark:text-indigo-400'
              ]"
            >
              <span v-if="creating">Creating...</span>
              <span v-else>+ Save current trace as scenario</span>
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import { BeakerIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useFlowStore } from '../store/flow'
import { useEditorClient } from '../store/client'

const props = defineProps({
  projectResourceName: {
    type: String,
    required: true
  }
})

const client = useEditorClient()
const store = useFlowStore()

const scenarios = ref([])
const loading = ref(false)
const creating = ref(false)

const storageKey = computed(() => `scenario:${props.projectResourceName}`)

const currentLabel = computed(() => {
  if (!store.scenario) return scenarios.value.length > 0 ? 'Scenarios' : 'Default'
  const sc = scenarios.value.find(s => s.ResourceName === store.scenario)
  return sc?.Name || store.scenario
})

const loadScenarios = async () => {
  if (!props.projectResourceName || !client) return

  loading.value = true
  try {
    const response = await client.flow.listScenarios({
      ProjectName: props.projectResourceName
    })
    scenarios.value = response?.Scenarios || []
  } catch (err) {
    console.error('Failed to load scenarios:', err)
    scenarios.value = []
  } finally {
    loading.value = false
  }
}

const selectScenario = (resourceName) => {
  store.applyScenario(resourceName)
  if (resourceName) {
    localStorage.setItem(storageKey.value, resourceName)
  } else {
    localStorage.removeItem(storageKey.value)
  }
}

const deleteScenario = async (resourceName) => {
  try {
    await client.flow.deleteScenario({
      ProjectName: props.projectResourceName,
      ResourceName: resourceName
    })
    await loadScenarios()
    // If deleted scenario was active, select next available or fall back to null
    if (store.scenario === resourceName) {
      const next = scenarios.value.length > 0 ? scenarios.value[0].ResourceName : null
      selectScenario(next)
    }
  } catch (err) {
    console.error('Failed to delete scenario:', err)
  }
}

const createFromTrace = async () => {
  if (!store.trace) return

  creating.value = true
  try {
    const name = `Trace ${store.trace.substring(0, 8)}`
    await client.flow.createScenarioFromTrace({
      ProjectName: props.projectResourceName,
      Name: name,
      TraceID: store.trace
    })
    await loadScenarios()
    // Auto-select the newly created scenario
    const created = scenarios.value[scenarios.value.length - 1]
    if (created) {
      selectScenario(created.ResourceName)
    }
  } catch (err) {
    console.error('Failed to create scenario:', err)
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await loadScenarios()
  const saved = localStorage.getItem(storageKey.value)
  if (saved && scenarios.value.some(s => s.ResourceName === saved)) {
    store.applyScenario(saved)
  } else if (scenarios.value.length > 0) {
    // Auto-select first scenario if none saved
    selectScenario(scenarios.value[0].ResourceName)
  }
})

watch(() => props.projectResourceName, () => {
  loadScenarios()
})
</script>
