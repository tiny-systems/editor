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
          <DialogTitle as="h3" class="text-center sm:mt-3 font-medium text-gray-900 dark:text-gray-100 ">
            Export Project to JSON
          </DialogTitle>
          <div class="h-full">
              <textarea ref="exportJSON"
                        class="mt-1 border-indigo-600 h-56 max-w-full placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out h-32 sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300"
                        :value="exportDialog"></textarea>
          </div>
          <div v-if="error" class="text-red-500 text-sm  py-2">
            {{ error }}
          </div>
          <div v-else class="flex justify-end p-3">
            <button @click="copyContent(); $emit('close')" type="button"
                    class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-md border border-gray-200 text-sm font-medium px-3 py-1 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
              Copy & Close
            </button>
          </div>
          <InlineOverlay v-if="loading">Loading</InlineOverlay>
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

import { onMounted, ref } from 'vue'
import InlineOverlay from '../canvas/InlineOverlay.vue'
import { useEditorClient } from '../store/client'

const client = useEditorClient()

const emit = defineEmits(['close'])
const exportDialog = ref('')
const loading = ref(false)
const error = ref(null)
const exportJSON = ref(null)

const props = defineProps({
  projectName: {
    type: String,
    required: true
  }
})

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(exportDialog.value)
  } catch (err) {
    console.error('failed to copy: ', err)
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const resp = await client.project.export({
      ProjectName: props.projectName
    })
    exportDialog.value = resp.Export
  } catch (e) {
    error.value = e.message || 'Failed to export project'
  } finally {
    loading.value = false
  }
})
</script>
