<template>
  <TransitionRoot as="template" show>
    <Dialog as="div" class="relative z-10"  @close="$emit('close')">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
        <form @submit.prevent="applyRevision">
          <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            <DialogPanel
              class="relative bg-white dark:bg-black dark:border dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 md:max-w-4xl w-full sm:p-6">
              <div v-if="revisionsLoading" class="text-center p-4 text-sm w-full dark:text-gray-600">
                <SmallLoadingCircle></SmallLoadingCircle>
                Loading list of revisions.</div>
              <div v-else class="overflow-scroll max-h-96">
                <div v-for="revision in revisions" :key="revision.id" class="group relative mb-8 cursor-pointer">
                  <div :class="[ 'absolute z-100 w-full z-50 top-0 left-0 text-black text-sm p-1 flex justify-between', selectedRevision !== null && selectedRevision === revision ? 'bg-indigo-500 dark:bg-indigo-800 text-white' : 'bg-gray-300 dark:bg-gray-800 dark:text-gray-300']">
                    <div>{{revision.revision}}</div>
                    <div>Nodes: {{revision.graph.nodes ? revision.graph.nodes.length : 0}} Edges: {{revision.graph.edges ? revision.graph.edges.length : 0}}
                        (<TimeAgo :title="new Date(revision.revisioncreatedat * 1000).toString()" :datetime="revision.revisioncreatedat * 1000"/>)
                    </div>
                  </div>
                  <div :class="['aspect-h-1 aspect-w-1 pt-4 w-full overflow-hidden lg:aspect-none lg:h-80', selectedRevision !== null && selectedRevision === revision ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-900']" @click="selectedRevision = revision">
                    <FlowPreview :graph="revision.graph" :id="'flow'+revision.revision"></FlowPreview>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="$emit('close')" type="button"
                        class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2 hover:text-gray-900 focus:z-10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                  Cancel
                </button>
                <button type="submit" :disabled="selectedRevision===null" :class="['font-medium rounded-lg text-sm items-center px-5 py-2 text-center', selectedRevision === null ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' : 'text-white bg-indigo-600 hover:bg-indigo-800 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:focus:ring-indigo-800']">
                  Apply <span v-if="selectedRevision"> rev. {{selectedRevision.revision}}</span>
                </button>
              </div>
            </DialogPanel>
          </div>
        </form>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
<script setup>
import {
  Dialog,
  DialogPanel,
  TransitionRoot
} from '@headlessui/vue'
import {onMounted, ref} from 'vue'
import {notify} from 'notiwind';
import FlowPreview from '../canvas/FlowPreview.vue';
import SmallLoadingCircle from '../support/SmallLoadingCircle.vue';
import TimeAgo from '../support/TimeAgo.vue';
import { useEditorClient } from '../store/client';

const client = useEditorClient()

const revisionsLoading = ref(false)
const revisions = ref([]);
const emits = defineEmits(['close', 'apply'])
const selectedRevision = ref(null)

const props = defineProps({
  flowId: {
    type: String,
    required: true
  },
})

const applyRevision = async () => {
  if (!selectedRevision.value) {
    return
  }

  try {
    await client.flow.applyFlowRevision({
      FlowID: selectedRevision.value.ID || selectedRevision.value.id,
      Revision: selectedRevision.value.Revision || selectedRevision.value.revision
    })
  } catch (e) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 99999)
  } finally {
    selectedRevision.value = null
    emits('close')
  }
}

onMounted(async () => {
  revisionsLoading.value = true
  revisions.value = []

  try {
    const resp = await client.flow.getFlowRevisions({
      FlowID: props.flowId
    })

    const fs = []
    const revisionsList = resp.Revisions || resp.revisions || []

    for (const f of revisionsList) {
      // Handle both PascalCase and lowercase
      const revision = {
        id: f.ID || f.id || '',
        revision: f.Revision || f.revision || 0,
        revisioncreatedat: Number(f.RevisionCreatedAt || f.revisioncreatedat || 0),
        graph: {}
      }

      // Parse graph data
      const graphData = f.Graph || f.graph
      if (graphData instanceof Uint8Array && graphData.length > 0) {
        try {
          revision.graph = JSON.parse(new TextDecoder().decode(graphData))
        } catch (e) {
          console.error('Failed to parse revision graph:', e)
          revision.graph = {}
        }
      } else if (typeof graphData === 'string' && graphData.length > 0) {
        try {
          revision.graph = JSON.parse(graphData)
        } catch (e) {
          revision.graph = {}
        }
      }

      fs.push(revision)
    }
    revisions.value = fs
  } catch (e) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'unknown server error'
    }, 99999)
  } finally {
    revisionsLoading.value = false
  }
})

</script>
