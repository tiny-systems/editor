<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="relative z-10" @close="$emit('close')">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-black dark:border dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
            <div>
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <ExclamationTriangleIcon class="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true"/>
              </div>
              <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Undeploy Flow
                </DialogTitle>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to undeploy <span class="font-medium text-gray-700 dark:text-gray-300">{{ flowName }}</span>?
                    This will remove all nodes and connections from your cluster. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
              <button @click="$emit('close')" type="button" :disabled="undeploying"
                      class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600 disabled:opacity-50">
                Cancel
              </button>
              <button @click="doUndeploy" type="button" :disabled="undeploying"
                      class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm items-center px-5 py-2 text-center disabled:opacity-50">
                <SmallLoadingCircle v-if="undeploying" class="inline mr-2" />
                Undeploy
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref } from 'vue'
import { navigateTo } from '../support/nav'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { notify } from 'notiwind'
import { useEditorClient } from '../store/client'
import SmallLoadingCircle from '../support/SmallLoadingCircle.vue'

const props = defineProps({
  flowId: {
    type: String,
    required: true
  },
  flowName: {
    type: String,
    required: true
  },
  redirectPath: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])
const client = useEditorClient()
const undeploying = ref(false)

const doUndeploy = async () => {
  if (!props.flowId) return

  undeploying.value = true
  try {
    await client.flow.undeployFlow({ FlowID: props.flowId })
    notify({ group: 'generic', title: 'Success', text: 'Flow undeployed successfully' }, 5000)
    emit('close')
    navigateTo(props.redirectPath)
  } catch (e) {
    notify({ group: 'error', title: 'Error', text: e.message || 'Failed to undeploy flow' }, 99999)
  } finally {
    undeploying.value = false
  }
}
</script>
