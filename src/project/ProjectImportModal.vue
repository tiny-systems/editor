<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="fixed inset-0 overflow-auto z-10 p-4 sm:p-6 md:p-20" @close="$emit('close')">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                       leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <DialogOverlay
          :class="['fixed inset-0', 'bg-gray-500 bg-opacity-25 transition-opacity dark:bg-black dark:bg-opacity-75 backdrop-blur-sm']"/>
      </TransitionChild>
      <TransitionChild as="template" enter="ease-out duration-300"
                       enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200"
                       leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
        <DialogPanel
          class="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 p-1 sm:w-full sm:max-w-3xl mx-auto dark:bg-black dark:border dark:border-gray-800 dark:text-gray-300">
          <DialogTitle as="h3" class="text-center sm:mt-3 font-medium text-gray-900 dark:text-gray-100">
            Import Project JSON
          </DialogTitle>

          <!-- Success state -->
          <div v-if="importDone" class="px-3 py-6">
            <div class="flex flex-col items-center gap-3">
              <CheckCircleIcon class="h-10 w-10 text-green-500" />
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ importMessage }}</p>
            </div>
            <div class="flex justify-end mt-4">
              <button
                @click="confirmSuccess"
                type="button"
                class="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 rounded-md text-sm font-medium px-4 py-1.5 dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                OK
              </button>
            </div>
          </div>

          <!-- Normal state -->
          <template v-else>
            <div class="h-full">
              <textarea
                v-model="importJSON"
                placeholder="Paste project JSON here..."
                class="mt-1 border-indigo-600 h-56 max-w-full placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300"
                autofocus
                :disabled="loading"
              ></textarea>
            </div>
            <!-- Error message -->
            <div v-if="parseError" class="px-1 py-2">
              <div class="flex items-start gap-2">
                <div class="flex-1 max-h-40 overflow-y-auto rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2">
                  <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap font-mono">{{ parseError }}</pre>
                </div>
                <button
                  @click="copyErrors"
                  type="button"
                  title="Copy errors"
                  class="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded"
                >
                  <ClipboardDocumentIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
            <!-- Progress display -->
            <div v-if="loading && importMessage" class="flex items-center py-2 px-1">
              <SmallLoadingCircle v-if="importMessageType === 0" class="mr-2" />
              <CheckCircleIcon v-else-if="importMessageType === 1" class="h-5 w-5 mr-2 text-green-500" />
              <ExclamationCircleIcon v-else-if="importMessageType === 3" class="h-5 w-5 mr-2 text-red-500" />
              <span class="text-sm" :class="{
                'text-gray-700 dark:text-gray-300': importMessageType === 0,
                'text-green-600 dark:text-green-400': importMessageType === 1,
                'text-red-600 dark:text-red-400': importMessageType === 3,
              }">
                {{ importMessage }}
              </span>
            </div>
            <div class="flex justify-end p-3 gap-2">
              <button
                @click="$emit('close')"
                type="button"
                class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-3 py-1 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                @click="importProject"
                type="button"
                :disabled="!importJSON.trim() || loading"
                class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-3 py-1 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600 disabled:opacity-50"
              >
                {{ loading ? 'Importing...' : 'Import' }}
              </button>
            </div>
          </template>
        </DialogPanel>
      </TransitionChild>
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

import { CheckCircleIcon, ExclamationCircleIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import SmallLoadingCircle from '../support/SmallLoadingCircle.vue'
import { ref } from 'vue'
import { notify } from 'notiwind'
import { useEditorClient } from '../store/client'

const client = useEditorClient()

const importJSON = ref('')
const parseError = ref('')
const loading = ref(false)
const importMessage = ref('')
const importMessageType = ref(0) // 0=Info, 1=Success, 3=Error
const importDone = ref(false)
const emit = defineEmits(['close', 'success'])

const props = defineProps({
  projectName: {
    type: String,
    required: true
  }
})

const confirmSuccess = () => {
  emit('success')
  emit('close')
}

const copyErrors = async () => {
  try {
    await navigator.clipboard.writeText(parseError.value)
  } catch (e) {
    // fallback
  }
}

const importProject = async () => {
  parseError.value = ''
  loading.value = true
  importMessage.value = 'Starting import...'
  importMessageType.value = 0
  importDone.value = false

  try {
    // Validate JSON format
    const data = JSON.parse(importJSON.value)
    if (!data.version || !data.tinyFlows || !data.elements) {
      throw new Error('Invalid project export format. Expected version, tinyFlows, and elements fields.')
    }

    for await (const response of client.project.import({
      ProjectName: props.projectName,
      Data: importJSON.value
    })) {
      importMessage.value = response.Message || 'Processing...'
      importMessageType.value = response.Type || 0
    }

    if (importMessageType.value === 1) {
      importDone.value = true
    }
  } catch (e) {
    parseError.value = e.message || 'Import failed'
    importMessage.value = ''
    importMessageType.value = 3
  } finally {
    loading.value = false
  }
}
</script>
