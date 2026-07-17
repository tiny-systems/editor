<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="relative z-10" @close="$emit('close')">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-black dark:border dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
            <form @submit.prevent="saveSelectedNode();">
              <div v-if="selectedNode">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CheckIcon class="h-6 w-6 text-green-600" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Rename node {{ selectedNode.data.label }}
                  </DialogTitle>
                  <div class="mt-2">
                    <input type="text" name="renameNodeError" :value="selectedNode ? selectedNode.data.label: ''" @input="event => newLabel = event.target.value"
                           :class="{ 'border-red-500': selectedNode.data.label === ''}"
                           class="mt-1 border-indigo-600 placeholder-gray-400 focus:ring-indigo-600 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300"
                           placeholder="Node name"/>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="$emit('close')" type="button"
                        class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                  Cancel
                </button>
                <button type="submit"
                        class="text-white bg-indigo-600 hover:bg-indigo-800 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:focus:ring-indigo-800 font-medium rounded-lg text-sm items-center px-5 py-2 text-center mr-2">
                  Rename
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
import {ref} from 'vue';
import {CheckIcon} from '@heroicons/vue/24/solid';
import {useFlowStore} from '../store/flow';
import {notify} from 'notiwind';

const props = defineProps({
  selectedNode: null
})

const store = useFlowStore()
const emits = defineEmits(['close'])
const newLabel = ref('')

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
  copy.data.label = newLabel.value
  store.update(copy)
  doSave()
  emits('close')
}
</script>
