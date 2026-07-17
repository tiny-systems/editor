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
            Import Flow JSON
          </DialogTitle>
          <div class="h-full">
            <textarea
              v-model="importFlowJSON"
              placeholder="Paste flow JSON here..."
              class="mt-1 border-indigo-600 h-56 max-w-full placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300"
              autofocus
            ></textarea>
          </div>
          <div v-if="parseError" class="text-red-500 text-sm py-2 px-1">
            {{ parseError }}
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
              @click="importFlow"
              type="button"
              :disabled="!importFlowJSON.trim() || store.loading"
              class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-3 py-1 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600 disabled:opacity-50"
            >
              {{ store.loading ? 'Importing...' : 'Import' }}
            </button>
          </div>
          <InlineOverlay v-if="store.loading">Importing</InlineOverlay>
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

import InlineOverlay from '../canvas/InlineOverlay.vue';
import {ref} from 'vue';
import {useFlowStore} from '../store/flow';

const importFlowJSON = ref('')
const parseError = ref('')
const store = useFlowStore()
const emits = defineEmits(['close'])

const importFlow = async () => {
  parseError.value = ''
  try {
    const elements = JSON.parse(importFlowJSON.value)
    if (!Array.isArray(elements)) {
      throw new Error('Expected an array of elements')
    }
    await store.import(elements)
    importFlowJSON.value = ''
    emits('close')
  } catch (e) {
    parseError.value = e.message || 'Invalid JSON'
  }
}
</script>
