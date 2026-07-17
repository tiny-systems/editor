<!--
  Composite "magic theater" panel. Drop this in anywhere the
  dashboard wants the live agent-activity surface — workspace home,
  project detail, etc. It opens the activity stream on mount,
  closes it on unmount, and renders the connection indicator +
  feed inside a perimeter-glow container that lights up while a
  tool call is in flight.

  Props:
    project — optional project resource name; when set, the
    underlying gRPC stream filters to that project's events.
    Workspace-level events (module install/uninstall) still
    come through regardless.
-->
<template>
  <PerimeterGlow :active="isAgentBusy">
    <section
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur p-5 flex flex-col max-h-[calc(100vh-14rem)]"
    >
      <header class="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 class="text-sm font-medium tracking-wide text-gray-700 dark:text-gray-200">
          Agent activity
        </h2>
        <div class="flex items-center gap-3">
          <!-- Sound toggle — short Web Audio tones on tool / flow /
               module events. Off by default; the state persists in
               localStorage so users don't re-enable each session. -->
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            :title="sounds.enabled.value ? 'Mute agent sounds' : 'Enable agent sounds'"
            @click="sounds.setEnabled(!sounds.enabled.value)"
          >
            <svg v-if="sounds.enabled.value" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 9v6h4l5 5V4L9 9H5z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 9v6h4l5 5V4L9 9H5zM17 9l4 4m0-4l-4 4" />
            </svg>
          </button>
          <ConnectionIndicator />
        </div>
      </header>
      <!-- Only the feed scrolls; the header stays put. -->
      <div class="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <ActivityFeed />
      </div>
    </section>
  </PerimeterGlow>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useActivityStore } from '~/stores/activity'
import { useAgentSounds } from '~/composables/useAgentSounds'
import PerimeterGlow from './PerimeterGlow.vue'
import ConnectionIndicator from './ConnectionIndicator.vue'
import ActivityFeed from './ActivityFeed.vue'

// Exposed in template so the speaker toggle reads / mutates the
// shared persisted state.
const sounds = useAgentSounds()

const props = withDefaults(defineProps<{ project?: string }>(), { project: '' })

const store = useActivityStore()

// Open the stream on mount; close it on unmount. Watch the project
// prop so navigating between projects swaps the subscription
// without remounting the whole panel.
onMounted(() => {
  store.start(props.project)
})
onBeforeUnmount(() => {
  store.stop()
})
watch(() => props.project, (next) => {
  store.start(next)
})

// "Busy" means a tool call landed recently. Soft signal — any
// tool.call.* event in the last few seconds keeps the perimeter
// breathing. Was 30s, which felt like the agent never finished;
// 6s tracks live activity without the glow lingering.
const BUSY_WINDOW_MS = 6_000
const isAgentBusy = computed(() => {
  const last = store.lastToolCallAt
  if (!last) return false
  return Date.now() - last < BUSY_WINDOW_MS && store.connection === 'live'
})
</script>
