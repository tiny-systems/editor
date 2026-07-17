<template>
  <TransitionRoot :show="open" as="template" @after-leave="query = ''">
    <Dialog as="div" class="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20" @close="open = false">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <DialogOverlay class="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity dark:bg-black dark:bg-opacity-75 backdrop-blur-sm" />
      </TransitionChild>

      <TransitionChild v-if="open" as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
        <Combobox as="div" class="mx-auto max-w-4xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black ring-opacity-5 transition-all" @update:modelValue="createInstance">
          <div class="relative">
            <MagnifyingGlassIcon class="pointer-events-none absolute top-3.5 left-4 h-6 w-6 text-gray-400" aria-hidden="true" />
            <ComboboxInput class="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-800 placeholder-gray-400 dark:text-gray-300 focus:ring-0 sm:text-sm focus:outline-none" placeholder="Search..." @change="query = $event.target.value" />
          </div>
          <div class="p-1 lg:px-8 space-y-1" v-if="filteredTags.length > 0">
            <a href="#" v-for="tag in filteredTags" :key="tag" @click.prevent="selectTag(tag)" :class="['text-xs inline-block py-1 px-2 uppercase rounded uppercase bg-indigo-300 dark:bg-indigo-600 last:mr-0 mr-1 opacity-75', currentTag === tag ? 'ring-2 ring-indigo-600' : '']">{{tag}}</a>
          </div>
          <div class="grid md:grid-cols-12" @mouseleave="currentComponent = null">
            <ComboboxOptions v-if="filteredComponents.length > 0" static :class="['max-h-96 scroll-py-2 divide-y divide-gray-100 dark:divide-gray-600 overflow-y-auto', currentComponent ? 'md:col-span-8' : 'col-span-12']">
              <li class="p-2">
                <h2 class="sr-only">Components</h2>
                <ul class="text-sm text-gray-700">
                  <ComboboxOption v-for="component in filteredComponents" :key="component.Component?.Name" :value="component" as="template" v-slot="{ active }">
                    <li :class="['flex cursor-pointer select-none items-center rounded-md px-3 py-2', active && 'bg-indigo-600 text-white']" @mouseover="currentComponent=component">
                      <span class="lg:ml-3 flex-none dark:text-gray-300">{{ component.Component?.Description }} {{ component.Installed ? '*' : '' }}</span>
                      <span :class="['ml-3 flex-auto text-left text-xs font-semibold truncate', active ? 'text-indigo-100' : 'text-gray-400']">
                        {{ component.Component?.Info }}
                        <strong v-for="tag in (component.Component?.Tags || [])" :key="tag" class="text-xs font-thin inline-block py-1 px-1 uppercase rounded text-gray-600 bg-gray-200 dark:bg-gray-800 dark:text-gray-200 uppercase last:mr-0 mr-1">{{tag}}</strong>
                      </span>
                    </li>
                  </ComboboxOption>
                </ul>
              </li>
            </ComboboxOptions>
            <div class="col-span-4 p-2 pb-6 text-sm dark:text-gray-300 text-center pt-5" v-if="currentComponent">
              <p class="font-bold">{{ currentComponent.Component?.Name }}</p>
              <p>{{ currentComponent.Component?.Info }}</p>

              <p class="pt-1 text-xs"><span class="bg-green-100 rounded-md py-1 px-1 text-green-700 dark:bg-green-900 dark:text-gray-300">
                {{ currentComponent.Module?.ID }} ({{ currentComponent.Module?.Version }})
              </span></p>
            </div>
          </div>
          <div v-if="filteredComponents.length === 0" class="py-4 px-6 text-center sm:px-14">
            <FolderIcon class="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
            <p class="mt-2 text-sm text-gray-900 dark:text-gray-300" v-if="query !== ''">
              We couldn't find any component with that term.
            </p>
            <template v-else>
              <p class="mt-2 text-sm text-gray-900 dark:text-gray-300">
                No components available.
              </p>
              <p class="mt-2 text-sm text-gray-900 dark:text-gray-300">
                Visit the <a :href="serverPath" @click="open = false" class="text-indigo-500 hover:text-indigo-600">server page</a> or browse the <a href="https://tinysystems.io/capabilities" target="_blank" class="text-indigo-500 hover:text-indigo-600">Capabilities catalog</a> to install modules.
              </p>
              <p class="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">
                We recommend starting with <a href="https://tinysystems.io/capabilities/tinysystems/common-module-v0?install" target="_blank" class="text-indigo-500 hover:text-indigo-600">common-module</a>.
              </p>
            </template>
          </div>
          <InlineOverlay v-if="loading">Loading</InlineOverlay>
        </Combobox>
      </TransitionChild>
    </Dialog>
  </TransitionRoot>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/solid'
import { FolderIcon } from '@heroicons/vue/24/outline'
import { useFlowStore } from '../store/flow'
import { useEditorClient, useEditorContext } from '../store/client'
import InlineOverlay from '../canvas/InlineOverlay.vue'

import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
  Dialog,
  DialogOverlay,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { notify } from 'notiwind'

const props = defineProps(['modelValue', 'flowName', 'projectName', 'position'])
const emit = defineEmits(['update:modelValue'])

const client = useEditorClient()
const editorCtx = useEditorContext()
const components = ref([])
const currentComponent = ref(null)
const store = useFlowStore()
const loading = ref(false)

// Handle both PascalCase (Connect-ES) and lowercase (legacy) field names
const workspaceSlug = computed(() => {
  const ws = editorCtx.workspace
  return ws?.Workspace?.SlugUniq || ws?.workspace?.sluguniq || ''
})

const modulesPath = computed(() => `/${workspaceSlug.value}/modules`)

const serverID = ref('')
const serverPath = computed(() => {
  if (!serverID.value || !workspaceSlug.value) return modulesPath.value
  return `/${workspaceSlug.value}/server/${serverID.value}`
})

const loadComponents = async () => {
  if (!client) {
    return
  }

  loading.value = true
  try {
    const resp = await client.flow.getComponents({
      FlowName: props.flowName,
      ProjectName: props.projectName
    })
    components.value = resp.Components || []

    // Fetch server UUID for the "install modules" link
    if (components.value.length === 0 && !serverID.value) {
      try {
        const config = await client.project.getProjectConfiguration({ ProjectName: props.projectName })
        const srv = config?.Configuration?.Server || config?.configuration?.server
        serverID.value = srv?.ID || srv?.id || ''
      } catch (e) {
        // fallback to modules page
      }
    }
  } catch (e) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 999999)
  } finally {
    loading.value = false
  }
}

const createInstance = (item) => {
  // Parse graph from bytes
  let graphData = item.Graph
  if (graphData instanceof Uint8Array && graphData.length > 0) {
    try {
      graphData = JSON.parse(new TextDecoder().decode(graphData))
    } catch (e) {
      console.error('Failed to parse component graph:', e)
      return
    }
  }

  const cmp = graphData
  cmp.id = '00000000000000000000'
  cmp.position = { x: props.position.x, y: props.position.y }
  cmp.hidden = true

  store.addElement({ id: '', graph: cmp })

  store.save().catch(e => {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 999999)
  })
  open.value = false
}

const open = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

watch(() => props.modelValue, (v) => {
  if (!v) {
    return
  }
  loadComponents()
}, { immediate: true })

const query = ref('')
const currentTag = ref('')

const selectTag = (tag) => {
  if (currentTag.value === tag) {
    tag = ''
  }
  currentTag.value = tag
}

const filteredComponents = computed(() => {
  return components.value.filter((component) => {
    const desc = component.Component?.Description || ''
    const tags = component.Component?.Tags || []
    return (
      desc.toLowerCase().includes(query.value.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(query.value.toLowerCase()))
    ) && (currentTag.value === '' || tags.includes(currentTag.value))
  })
})

const filteredTags = computed(() => {
  const allTags = filteredComponents.value
    .map(component => component.Component?.Tags || [])
    .flat()
  return [...new Set(allTags)]
})
</script>
