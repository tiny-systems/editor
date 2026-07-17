<template>
  <div class="text-center text-sm p-4 dark:text-white" v-if="loading">
    Loading <SmallLoadingCircle class="w-4 h-4 inline-block"></SmallLoadingCircle>
  </div>
  <form class="pt-2" @submit.prevent="void 0" v-else>
    <div class="relative">
      <div class="overflow-y-auto max-w-xl" v-if="schema && data">
        <json-editor :schema="schema" no-border :initial-value="data" :plain-struct="true" :disable-collapse="true" theme="lg" @update-value="updateValue($event)">
        </json-editor>
      </div>
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none" v-if="hasNameError">
        <svg class="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
  </form>
</template>
<script setup>
import { ref, onMounted, watch } from 'vue'
import { notify } from 'notiwind'
import SmallLoadingCircle from '../support/SmallLoadingCircle.vue'
import { JSONEditor as JsonEditor } from '@tinysystems/editor'
import { Base64 } from 'js-base64'

const props = defineProps({
  projectName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['success'])
const { $grpc } = useNuxtApp()

const name = ref('')
const schema = ref({})
const data = ref(null)
const loading = ref(false)
const hasNameError = ref(false)

watch(name, () => {
  hasNameError.value = false
})

onMounted(async () => {
  loading.value = true

  try {
    const resp = await $grpc.project.getConfiguration({
      ProjectName: props.projectName
    })

    // Handle both PascalCase and lowercase
    const form = resp.CreateDashboardPageForm || resp.createdashboardpageform
    if (form) {
      const formSchema = form.Schema || form.schema
      const formData = form.Data || form.data

      // Handle bytes - can be Uint8Array or base64 string
      if (formSchema) {
        if (formSchema instanceof Uint8Array && formSchema.length > 0) {
          schema.value = JSON.parse(new TextDecoder().decode(formSchema))
        } else if (typeof formSchema === 'string' && formSchema.length > 0) {
          schema.value = JSON.parse(Base64.decode(formSchema))
        }
      }
      if (formData) {
        if (formData instanceof Uint8Array && formData.length > 0) {
          data.value = JSON.parse(new TextDecoder().decode(formData))
        } else if (typeof formData === 'string' && formData.length > 0) {
          data.value = JSON.parse(Base64.decode(formData))
        }
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
})

const updateValue = async (event) => {
  if (event.isAction && event.isValid) {
    try {
      await $grpc.project.createDashboardPage({
        ProjectName: props.projectName,
        CreatePageForm: {
          Data: new TextEncoder().encode(JSON.stringify(data.value))
        }
      })

      notify({
        group: "generic",
        title: "Success",
        text: "Page has been created!"
      }, 10000)

      emit('success')
    } catch (e) {
      notify({
        group: "error",
        title: "Error",
        text: e.message || 'unknown server error'
      }, 999999)
    }
  }
}
</script>
