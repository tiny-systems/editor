<template>
  <form class="pt-5" @submit.prevent="onSubmit">
    <div class="relative">
      <label for="new-flow-name" class="sr-only">Name</label>
      <input type="text" name="new-flow-name" id="new-flow-name" ref="newFlowNameInput" v-model="name"
             :class="{ 'border-red-500': hasNameError}" class="mt-1 border-indigo-500 placeholder-gray-400 appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight transition duration-150 ease-in-out sm:text-sm sm:leading-5 dark:bg-gray-900 dark:text-gray-300" placeholder="Flow title" />
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none" v-if="hasNameError">
        <svg class="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    <div class="pt-3">
      <button type="submit" :disabled="loading" class="inline-flex items-center px-4 py-3 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-indigo-500 disabled:opacity-50">
        <span v-if="loading">Creating...</span>
        <span v-else>Create</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { notify } from 'notiwind'
import { useEditorClient } from '../store/client'

const props = defineProps<{
  projectID: string
}>()

const emit = defineEmits(['success'])

const client = useEditorClient()

const name = ref('')
const hasNameError = ref(false)
const loading = ref(false)
const newFlowNameInput = ref<HTMLInputElement | null>(null)

watch(name, () => {
  hasNameError.value = false
})

onMounted(() => {
  newFlowNameInput.value?.focus()
})

const onSubmit = async () => {
  if (!name.value) {
    hasNameError.value = true
    return
  }

  hasNameError.value = false
  loading.value = true

  try {
    const req = {
      Name: name.value,
      ProjectID: props.projectID
    }

    await client.flow.createFlow(req)

    name.value = ''
    notify({
      group: "generic",
      title: "Success",
      text: "Your flow has been created!"
    }, 10000)
    emit('success')
  } catch (e: any) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 999999)
  } finally {
    loading.value = false
  }
}
</script>
