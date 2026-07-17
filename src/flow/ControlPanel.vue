<template>
  <div class="lg:items-center lg:justify-center p-1 lg:p-3 border-b dark:border-gray-800">
    <div class="flex justify-between align-middle">
      <div class="flex justify-left align-middle">
        <button type="button" @click="navigateTo(projectPath)" title="Back to project"
                class="text-indigo-600 border border-indigo-600 hover:bg-indigo-600 hover:text-white focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center mr-2 dark:border-indigo-500 dark:text-indigo-500 dark:hover:text-white dark:focus:ring-indigo-800">
          <svg aria-hidden="true" class="w-5 h-5 rotate-180" fill="currentColor" viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clip-rule="evenodd"></path>
          </svg>
          <span class="sr-only">Back to project</span>
        </button>
        <div class="inline-flex items-center max-w-[32rem]" v-if="project && flow">
          <span class="text-lg leading-tight font-semibold text-gray-900 dark:text-gray-100 truncate max-w-64 tracking-tight">{{ projectName }}</span>
          <span class="text-lg leading-tight text-gray-300 dark:text-gray-600 px-1.5">/</span>
          <FlowSwitcher
            :current-flow="flow"
            :project-resource-name="projectResourceName"
            :workspace-slug="workspaceSlug"
          />
        </div>
        <div class="inline-flex items-center ml-2" v-if="project">
          <ScenarioSwitcher :project-resource-name="projectResourceName" />
        </div>
        <div class="inline-flex items-center" v-if="store.revision > 0">
          <a href="#" @click.prevent="store.showRevisions=true"><span
            class="text-indigo-600 ml-3 text-sm">rev. {{ store.revision }}</span></a>
        </div>
      </div>

      <!-- Flow actions menu -->
      <FlowActionsMenu
        v-if="flow"
        :flow-id="flowId"
        :flow-name="flowName"
        :redirect-path="projectPath"
      />
    </div>
  </div>
</template>
<script>
import {ref, computed} from 'vue'
import {useFlowStore} from '../store/flow'
import { useEditorContext } from '../store/client'
import { navigateTo } from '../support/nav'
import FlowSwitcher from './FlowSwitcher.vue'
import FlowActionsMenu from './FlowActionsMenu.vue'
import ScenarioSwitcher from './ScenarioSwitcher.vue'

// Simple debounce helper
function debounce(fn, delay) {
  let timeoutId = null
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export default {
  props: ['flow', 'project'],
  emits: [],
  data() {
    return {}
  },
  methods: {},
  setup(props) {
    const store = useFlowStore()
    const editorCtx = useEditorContext()
    const message = ref('');

    // Handle both PascalCase (Connect-ES) and lowercase (legacy) field names
    const workspaceSlug = computed(() => {
      const ws = editorCtx.workspace
      return ws?.Workspace?.SlugUniq || ws?.workspace?.sluguniq || ''
    })

    const flowName = computed(() => {
      return props.flow?.Name || props.flow?.name || ''
    })

    const flowId = computed(() => {
      return props.flow?.ID || props.flow?.id || ''
    })

    const projectName = computed(() => {
      return props.project?.Name || props.project?.name || ''
    })

    const projectResourceName = computed(() => {
      return props.project?.ResourceName || props.project?.resourcename || ''
    })

    const projectPath = computed(() => {
      return `/${workspaceSlug.value}/project-${projectResourceName.value}`
    })
    const debouncedSave = debounce(() => {
      store.save().then(() => {
      }).catch(e => {
        message.value = ''
        console.error('Save error:', e.message || 'unknown server error')
      })
    }, 200)

    store.$subscribe((mutation, opts) => {
      if (store.readOnly) return
      if (mutation.type !== 'patch object' && mutation.type !== 'patch function') {
        return;
      }
      debouncedSave()
    })

    return {
      store,
      message,
      flowName,
      flowId,
      projectName,
      projectResourceName,
      projectPath,
      workspaceSlug,
      navigateTo
    }
  },

  components: {
    FlowSwitcher,
    FlowActionsMenu,
    ScenarioSwitcher
  },
}
</script>
<style>
</style>
