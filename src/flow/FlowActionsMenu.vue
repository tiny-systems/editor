<template>
  <div class="relative inline-block text-left">
    <Menu as="div">
      <MenuButton class="p-2 rounded-full flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <span class="sr-only">Open flow options</span>
        <EllipsisVerticalIcon class="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems class="origin-top-right absolute z-50 right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none dark:ring-gray-600 dark:bg-gray-900">
          <div class="py-1">
            <MenuItem v-slot="{ active }">
              <button
                @click="showUndeployModal = true"
                type="button"
                :class="[active ? 'bg-gray-100 dark:bg-gray-800' : '', 'w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400']"
              >
                <TrashIcon class="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Undeploy Flow</span>
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>

    <FlowUndeployModal
      v-if="showUndeployModal"
      :flow-id="flowId"
      :flow-name="flowName"
      :redirect-path="redirectPath"
      @close="showUndeployModal = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { EllipsisVerticalIcon } from '@heroicons/vue/24/solid'
import { TrashIcon } from '@heroicons/vue/24/outline'
import FlowUndeployModal from './FlowUndeployModal.vue'

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

const showUndeployModal = ref(false)
</script>
