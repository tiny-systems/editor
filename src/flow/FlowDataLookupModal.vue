<template>
  <TransitionRoot as="template" :show="dataLookupModal" @close="dataLookupModal = false">
    <Dialog as="div" :class="['fixed inset-0 z-10', isMaximized ? 'overflow-hidden p-4' : 'overflow-y-auto p-4 sm:p-6 md:p-20']" @close="dataLookupModal=false" :initialFocus="expressionInputRef">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                       leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <DialogOverlay :class="['fixed inset-0', 'bg-gray-500 bg-opacity-25 transition-opacity dark:bg-black dark:bg-opacity-75 backdrop-blur-sm']"/>
      </TransitionChild>
      <DialogPanel
        :class="[
          'relative transform rounded-lg bg-white text-left shadow-xl transition-all p-1 mx-auto dark:bg-black dark:border dark:border-gray-800 dark:text-gray-300',
          isMaximized ? 'w-full h-full max-w-none overflow-hidden' : 'sm:my-8 sm:w-full sm:max-w-6xl'
        ]">
        <form @submit.prevent="addExpression(false)" :class="isMaximized ? 'h-full flex flex-col overflow-hidden' : ''">
          <inline-overlay v-if="store.loadingAlt">Loading</inline-overlay>
          <input type="text" name="prevent_autofill" value="" style="display:none;"/>
          <input type="password" name="password_fake" value="" style="display:none;"/>
          <div class="absolute top-0 right-0 hidden pt-2 pr-2 sm:flex sm:gap-1 z-10">
            <button @click="toggleMaximize" type="button"
                    class="rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <span class="sr-only">{{ isMaximized ? 'Minimize' : 'Maximize' }}</span>
              <ArrowsPointingInIcon v-if="isMaximized" class="h-5 w-5" aria-hidden="true"/>
              <ArrowsPointingOutIcon v-else class="h-5 w-5" aria-hidden="true"/>
            </button>
            <button @click="dataLookupModal = false" type="button"
                    class="rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <span class="sr-only">Close</span>
              <XMarkIcon class="h-5 w-5" aria-hidden="true"/>
            </button>
          </div>
          <div :class="['sm:flex sm:items-start', isMaximized ? 'flex-1 min-h-0' : '']" v-if="selectedDataSource">
            <div :class="['mt-3 text-center sm:mt-0 sm:text-left w-full', isMaximized ? 'h-full flex flex-col' : '']">
              <DialogTitle as="h3" class="font-medium leading-6 text-gray-900 dark:text-gray-300 flex-shrink-0">
                <span v-if="!!dataLookupTitle">{{ dataLookupTitle }}</span>
              </DialogTitle>
              <div :class="['py-2 flex w-full', isMaximized ? 'flex-1 min-h-0' : '']">
                <div class="w-2/6 pr-2 flex flex-col">
                  <div class="text-xs font-medium text-center flex-shrink-0 pb-2">Source data</div>
                  <div :class="['overflow-auto', isMaximized ? 'flex-1' : '']" :style="isMaximized ? '' : 'height: 300px'">
                    <vue-json-pretty v-if="selectedDataSource && dataLookupDataReady"
                                     :highlightSelectedNode="true"
                                     :theme="isDark ? 'dark' : 'light'"
                                     :selectedValue="dataExpression"
                                     @nodeClick="onNodeClick"
                                     :data="dataLookupData" rootPath="$" selectableType="single" :deep="1"></vue-json-pretty>
                  </div>
                </div>
                <div class="w-2/6 flex flex-col">
                  <div class="text-xs font-medium text-center flex-shrink-0 pb-2">Required JSON schema of the result</div>
                  <div :class="['overflow-auto', isMaximized ? 'flex-1' : '']" :style="isMaximized ? '' : 'height: 300px'">
                    <vue-json-pretty v-if="selectedDataSource"
                                     :theme="isDark ? 'dark' : 'light'"
                                     :data="dataLookupSchema" :deep="1"></vue-json-pretty>
                  </div>
                </div>
                <div class="w-2/6 flex flex-col">
                  <div class="text-xs font-medium text-center flex-shrink-0 pb-2">The result of the expression</div>
                  <div :class="['overflow-auto text-xs', isMaximized ? 'flex-1' : '']" :style="isMaximized ? '' : 'height: 300px'">
                    <vue-json-pretty v-if="typeof expressionValidationResult === 'object'"
                                     :theme="isDark ? 'dark' : 'light'"
                                     :data="expressionValidationResult" :deep="1"></vue-json-pretty>
                    <div v-else class="p-2">{{ expressionValidationResult }}</div>
                  </div>
                </div>
              </div>
              <div v-if="expressResultValidError"
                   class="bg-red-100 text-xs rounded-md py-2 px-3 mb-1 text-red-700 dark:bg-red-900 dark:text-gray-300 flex-shrink-0"
                   role="alert">
                {{ expressResultValidError }}
              </div>
              <div v-else-if="expressResultValid"
                   class="bg-green-100 text-xs rounded-md py-2 px-3 mb-1 text-green-700 dark:bg-green-900 dark:text-gray-300 flex-shrink-0">
                The result of the expression returns data which is valid to the JSON schema
              </div>
              <div class="grid grid-cols-12 flex-shrink-0">
                <div class="col-span-9">
                      <textarea id="dataExpression" ref="expressionInputRef" v-model="dataExpressionResult"
                                :class="{ 'border-red-500': false}"
                                class="placeholder-gray-400 py-3 border shadow-sm text-xs appearance-none rounded-md w-full py-2 px-2 text-gray-700 transition duration-150 ease-in-out dark:bg-gray-900 dark:text-gray-300 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Expression"/>
                </div>
                <div class="flex col-span-3 space-x-2 pl-1 justify-items-stretch">
                  <button type="button" @click="addExpression(false)" class="px-4 py-3 border w-full border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-indigo-500">
                    <span v-if="expressResultValid">Inject Expression</span>
                    <span v-else-if="!!dataExpressionResult">Test</span>
                    <span v-else>Close</span>
                  </button>
                  <button type="button" v-if="expressResultValidError" @click="addExpression(true)" class="px-4 py-3 border w-full border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-indigo-500">
                    Inject anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogPanel>
    </Dialog>
  </TransitionRoot>
</template>
<script setup>
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
  DialogOverlay
} from '@headlessui/vue'

import InlineOverlay from '../canvas/InlineOverlay.vue';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import {XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon} from '@heroicons/vue/24/solid';
import {useFlowStore} from '../store/flow';
import {computed, ref, watch} from 'vue';
import {useShiftKeyWatcher} from '../support/shift-key-watcher';
import { useDark } from '@vueuse/core';


const props = defineProps({
  selectedNode: null
})

const store = useFlowStore()
const isDark = useDark()

const dataExpressionResult = ref('')

const expressionValidationResult = ref(null)
const expressResultValid = ref(false)
const expressResultValidError = ref(null)
const selectedDataSource = ref(null)

const expressionInputRef = ref(null)

const dataLookupModal = ref(false)
const dataLookupData = ref(null)
const dataLookupDataReady = ref(false)
const dataLookupSchema = ref(null)
const dataLookupTitle = ref('')
const dataSources = ref([])
const isMaximized = ref(false)

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value
}

const onNodeClick = (node) => {
  // Use @nodeClick instead of v-model:selectedValue so that
  // bracket clicks (expand/collapse) don't overwrite the expression
  if (node && node.path) {
    dataExpression.value = node.path
  }
}

const shiftPressed = useShiftKeyWatcher();

watch(dataExpressionResult, (v) => {
  if (v == null) {
    return
  }
  expressResultValid.value = false
  expressResultValidError.value = null
})


// watch for source of data lookup change
watch(selectedDataSource, (v) => {
  if (v === undefined) {
    return
  }
  dataLookupDataReady.value = false
  store.inspectNodePort(v.id, v.nodeID).then(data => {
    dataLookupData.value = JSON.parse(data)
  }).catch(e => {
    dataLookupData.value = e
  }).finally(() => {
    dataLookupDataReady.value = true
  })
})

const dataExpression = computed({
  get() {
    return dataExpressionResult.value
  },
  set(v) {
    expressResultValid.value = false
    expressResultValidError.value = null
    if (!dataExpressionResult.value) {
      dataExpressionResult.value = v
      return
    }
    if (shiftPressed.value) {
      dataExpressionResult.value = dataExpressionResult.value + v
    } else {
      dataExpressionResult.value = v
    }
  }
})

let callback = (expression) => {}
//lookup
const lookup = (data, allSchema, propSchema, cb) => {
  // check refs
  // copy them to defs

  let copy = deepCopy(propSchema) // deep clone

  //@todo fix this crap
  // check all refs in a props schema and copy them from all schema
  if (propSchema.items && propSchema.items['$ref']) {
    let ref = propSchema.items['$ref'].substring('#/$defs/'.length)
    if(copy['$defs'] === undefined) {
      copy['$defs'] = {}
    }
    copy['$defs'][ref] = allSchema['$defs'][ref]
  }

  dataExpressionResult.value = null
  // Extract expression from {{expr}} format or legacy data.expression format
  let expression = null
  if (typeof data === 'string') {
    const match = data.match(/^\{\{(.+)\}\}$/)
    if (match) {
      expression = match[1]
    }
  } else if (data && data.expression) {
    expression = data.expression
  }
  dataExpression.value = expression
  expressionValidationResult.value = null
  expressResultValidError.value = null
  expressResultValid.value = false

  dataLookupTitle.value = copy.title || ''
  cleanUpSchema(copy)
  dataLookupSchema.value = copy
  callback = cb

  if (store.selectedEdge) {
    dataSources.value = []
    const handle = store.selectedEdge.sourceNode.data.handles.find(a => a.id === store.selectedEdge.sourceHandle)
    if (!handle) {
      return
    }
    selectedDataSource.value = {
      'id': handle.id,
      'nodeID': store.selectedEdge.sourceNode.id,
      'label': store.selectedEdge.sourceNode.data.label + ' - ' + handle.label
    }
  }
  dataLookupModal.value = true
}

const deepCopy = (o) => {
  return JSON.parse(JSON.stringify(o))
}

const cleanUpSchema = (obj) => {
  for (let prop in obj) {
    if (prop === 'configure' || prop === 'configurable' || prop === 'default' || prop === 'title' || prop === 'requiredWhen' || prop === 'optionalWhen' ||
      prop === 'expression' || prop === 'path' || prop === 'propertyOrder' ||
      prop === 'description' || prop === 'enumTitles' || prop === 'colSpan' || prop === 'align' || prop === 'style') {
      delete obj[prop];
    }
    if (prop === 'type' && obj[prop] === '') {
      delete obj[prop];
    }
    if (prop === 'type' && obj[prop] === 'object') {
      obj['additionalProperties'] = true
    }
    if (typeof obj[prop] === 'object') {
      cleanUpSchema(obj[prop]);
    }
  }
}


const addExpression = (force) => {
  if (expressResultValid.value || force) {
    callback(dataExpressionResult.value, '', '', '')
    dataLookupModal.value = false
    return
  }
  if (dataExpressionResult.value === '' || dataExpressionResult.value === null) {
    callback(dataExpressionResult.value, '', '', '')
    dataLookupModal.value = false
    return;
  }
  store.runExpression(dataExpressionResult.value, dataLookupData.value, dataLookupSchema.value).then(data => {
    expressionValidationResult.value = JSON.parse(data.Result)
    expressResultValid.value = data.ValidSchema
    expressResultValidError.value = data.ValidationError
  }).catch(e => {
    expressResultValid.value = false
    expressResultValidError.value = e.toString()
  }).finally(() => {
  })
}

defineExpose({lookup})
</script>

<style scoped>
/* VueJsonPretty font size - match port data preview */
:deep(.vjs-tree) {
  font-size: 10px !important;
  line-height: 1.4 !important;
}

/* Fix hover color - make it more visible */
:deep(.vjs-tree-node:hover) {
  background-color: rgba(59, 130, 246, 0.15) !important;
}

/* Selected node highlight */
:deep(.vjs-tree-node.is-highlight) {
  background-color: rgba(59, 130, 246, 0.25) !important;
}

/* Dark mode hover */
.dark :deep(.vjs-tree-node:hover) {
  background-color: rgba(59, 130, 246, 0.25) !important;
}

.dark :deep(.vjs-tree-node.is-highlight) {
  background-color: rgba(59, 130, 246, 0.35) !important;
}
</style>
