<template>
  <form class="pt-5" @submit.prevent="void 0">
    <div class="relative">
      <div class="overflow-y-auto max-w-xl" v-if="schema && data">
        <json-editor :schema="schema" no-border :initial-value="data" :plain-struct="true" :disable-collapse="true" theme="lg" @update-value="updateValue($event)">
        </json-editor>
      </div>
      <div v-else-if="loading" class="text-center py-4 text-gray-500">
        Loading...
      </div>
      <div v-else-if="error" class="text-center py-4 text-red-500">
        {{ error }}
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notify } from 'notiwind'
import JsonEditor from '../json-editor/JSONEditor.vue'
import { useEditorClient } from '../store/client'

const props = defineProps<{
  flowName: string
  projectName: string
}>()

const emit = defineEmits(['success'])

const client = useEditorClient()

const schema = ref<any>(null)
const data = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  error.value = null

  try {
    const req = {
      FlowName: props.flowName,
      ProjectName: props.projectName
    }

    const resp = await client.flow.getFlow(req)

    // Parse schema and data from the RenameForm Configuration
    const renameForm = resp.RenameForm
    if (renameForm) {
      // Handle Uint8Array from Connect-ES
      if (renameForm.Schema && renameForm.Schema.length > 0) {
        const schemaStr = new TextDecoder().decode(renameForm.Schema)
        schema.value = JSON.parse(schemaStr)
      }
      if (renameForm.Data && renameForm.Data.length > 0) {
        const dataStr = new TextDecoder().decode(renameForm.Data)
        data.value = JSON.parse(dataStr)
      }
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load flow'
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 999999)
  } finally {
    loading.value = false
  }
})

const updateValue = async (event: any) => {
  if (!event.isAction || !event.isValid) {
    return
  }

  loading.value = true

  try {
    const renameConf = {
      Data: new TextEncoder().encode(JSON.stringify(data.value)) as Uint8Array<ArrayBuffer>
    }

    const req = {
      RenameForm: renameConf,
      FlowName: props.flowName,
      ProjectName: props.projectName
    }

    await client.flow.renameFlow(req)

    notify({
      group: "generic",
      title: "Success",
      text: "Your flow has been renamed!"
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
