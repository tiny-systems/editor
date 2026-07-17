<template>
  <div :id="data.id" :gs-id="data.id" :gs-x="data.grid.x" :gs-y="data.grid.y" :gs-w="data.grid.w" :gs-h="data.grid.h">
    <div class="grid-stack-item-content group relative highlight-white/5 rounded-md"
         :class="{ 'cursor-move border dark:border-gray-700': isEditing }">
      <div class="text-sm text-center p-1 dark:text-gray-400">
        <div v-if="isEditing" class="flex justify-between gap-x-2 relative">
          <input type="text" v-model="data.title"
                 class="border-indigo-500 text-sm p-1 w-full placeholder-gray-400 appearance-none border rounded outline-0 text-center text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <Listbox v-model="data.pagesList" multiple class="min-w-48" as="div">
            <ListboxButton
              class="bg-white truncate w-full border border-gray-300 dark:bg-gray-700 dark:border-gray-900 rounded-md pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              Pages: {{ (data.pagesList || []).map(page => page).join(', ') }}
            </ListboxButton>
            <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
                        leave-to-class="opacity-0">
              <ListboxOptions class="absolute min-w-48 z-10 mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none dark:bg-gray-600">
                <ListboxOption v-for="page in pages" :key="page.ID || page.id" :value="page.Name || page.name" v-slot="{ active, selected }">
                  <li :class="[active ? 'text-white bg-indigo-600' : 'text-gray-900', 'text-sm text-left cursor-default select-none relative py-2 pl-3 pr-9']">
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                        {{ page.Title || page.title || page.Name || page.name }}
                      </span>
                      <span v-if="selected"
                        :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                        <CheckIcon class="h-4 w-4" aria-hidden="true"/>
                      </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </Listbox>
        </div>
        <div v-else>{{ data.title }}</div>
      </div>
      <div class="flex items-center justify-center">
        <button v-if="isEditing"
                class="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-10 right-2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-opacity"
                @click="editWidgetSchema"
                title="Edit widget schema"
                aria-label="Edit widget schema">
          <PencilSquareIcon class="w-5 h-5 fill-gray-200 text-gray-600 dark:fill-gray-700 dark:text-gray-300"></PencilSquareIcon>
        </button>
        <button v-if="isEditing && data.schema"
                class="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-10 right-8 p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-opacity"
                @click="resetWidgetSchema"
                title="Reset widget schema"
                aria-label="Reset widget schema">
          <TrashIcon class="w-5 h-5 fill-gray-200 text-gray-600 dark:fill-gray-700 dark:text-gray-300"></TrashIcon>
        </button>
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script setup>
import {PencilSquareIcon, TrashIcon} from '@heroicons/vue/24/outline'
import Button from "../dashboard/Button.vue";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/vue'
import {CheckIcon} from "@heroicons/vue/24/solid";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
  pages: {
    type: Array
  },
  isEditing: Boolean,
});

const emit = defineEmits(['edit-schema', 'reset-schema']);

function editWidgetSchema() {
  emit("edit-schema", props.data);
}

function resetWidgetSchema() {
  emit("reset-schema", props.data);
}
</script>
