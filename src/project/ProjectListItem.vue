<template>
  <NuxtLink
    :to="{ path: `/${workspaceSlug}/project-${resourceName}`, query: $route.query }"
    :class="[
      'block px-4 py-3 transition-colors',
      props.highlighted
        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
        : 'hover:bg-gray-50 dark:hover:bg-gray-900'
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
        {{ projectName }}
      </p>
      <div class="flex-shrink-0 flex items-center gap-2">
        <span
          v-if="isTemporary"
          class="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-400"
          :title="`Temporary playground project — auto-deletes when this runs out (${ttlLabel})`"
        >
          <ClockIcon class="h-3 w-3" aria-hidden="true"/>
          {{ ttlLabel }}
        </span>
        <span
          v-if="pinned"
          class="tracking-widest uppercase text-[10px] text-gray-400 dark:text-gray-500"
          title="Pinned"
        >
          Pinned
        </span>
      </div>
    </div>
    <div class="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span class="inline-flex items-center gap-1">
        <UsersIcon class="h-3.5 w-3.5" aria-hidden="true"/>
        {{ flowsAmount }}
      </span>
      <span v-if="server" class="inline-flex items-center gap-1 truncate">
        <CogIcon class="h-3.5 w-3.5" aria-hidden="true"/>
        <span class="truncate">{{ server.Info || server.info }}</span>
      </span>
    </div>
  </NuxtLink>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { CogIcon, UsersIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  proj: any
  highlighted?: boolean
}>()

const auth = useAuthStore()

// Handle both PascalCase (Connect-ES) and lowercase (legacy) field names
const workspaceSlug = computed(() => {
  const ws = auth.workspace
  return ws?.Workspace?.SlugUniq || ws?.workspace?.sluguniq || ''
})

const project = computed(() => props.proj?.Project || props.proj?.project)
const projectName = computed(() => project.value?.Name || project.value?.name || '')
const resourceName = computed(() => project.value?.ResourceName || project.value?.resourcename || '')
const flowsAmount = computed(() => project.value?.FlowsAmount || project.value?.flowsamount || 0)
const server = computed(() => props.proj?.Server || props.proj?.server)
const pinned = computed(() => props.proj?.Pinned || props.proj?.pinned)

// Per-project TTL. 0 = persistent (user-created); > 0 = temporary trial
// project the reaper deletes at that unix time. int64 arrives as bigint.
const expiresAtUnix = computed(() => {
  const v = project.value?.PlaygroundExpiresAtUnix ?? project.value?.playgroundExpiresAtUnix ?? 0
  return typeof v === 'bigint' ? Number(v) : Number(v || 0)
})
const isTemporary = computed(() => expiresAtUnix.value > 0)
const ttlLabel = computed(() => {
  if (!isTemporary.value) return ''
  const secs = expiresAtUnix.value - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'expiring…'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `expires in ${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `expires in ${hrs}h ${rem}m` : `expires in ${hrs}h`
})
</script>
