<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  handles: any[]
  selectedHandleId: string | null
}>()

const emit = defineEmits<{
  select: [handleId: string]
}>()

// Filter handles - exclude those starting with underscore
const visibleHandles = computed(() => {
  return (props.handles || []).filter(h => h.id && !h.id.startsWith('_'))
})

// Group handles by position (rotated_position: 0=top, 1=right, 2=bottom, 3=left)
const handlesByPosition = computed(() => {
  const groups = { top: [] as any[], right: [] as any[], bottom: [] as any[], left: [] as any[] }

  for (const handle of visibleHandles.value) {
    const pos = handle.rotated_position ?? 0
    if (pos === 0) groups.top.push(handle)
    else if (pos === 1) groups.right.push(handle)
    else if (pos === 2) groups.bottom.push(handle)
    else if (pos === 3) groups.left.push(handle)
  }

  return groups
})

const hasAnyHandles = computed(() => visibleHandles.value.length > 0)

const selectHandle = (handleId: string) => {
  emit('select', handleId)
}

const isSelected = (handleId: string) => {
  return props.selectedHandleId === handleId
}
</script>

<template>
  <div v-if="hasAnyHandles" class="port-tabs-container relative flex flex-col h-full">
    <!-- Top tabs row (always present for spacing) -->
    <div class="flex justify-center flex-shrink-0 tab-row-horizontal">
      <button
        v-for="handle in handlesByPosition.top"
        :key="handle.id"
        @click="selectHandle(handle.id)"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-t-lg border-2 border-b-0 transition-colors',
          isSelected(handle.id)
            ? 'bg-indigo-500 text-white border-indigo-500'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-900'
        ]"
        :title="handle.label || handle.id"
      >
        {{ handle.label || handle.id }}
      </button>
    </div>

    <!-- Middle row: Left tabs, content area, Right tabs -->
    <div class="flex flex-1 min-h-0">
      <!-- Left tabs column (always present for spacing) -->
      <div class="flex flex-col justify-center gap-1 py-1 flex-shrink-0 tab-col-vertical overflow-y-auto">
        <button
          v-for="handle in handlesByPosition.left"
          :key="handle.id"
          @click="selectHandle(handle.id)"
          :class="[
            'side-tab rounded-l-md border-2 border-r-0',
            isSelected(handle.id)
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-900'
          ]"
          :title="handle.label || handle.id"
        >
          <span class="side-tab-label">{{ handle.label || handle.id }}</span>
        </button>
      </div>

      <!-- Center content slot -->
      <div class="flex-1 min-w-0 min-h-0">
        <slot></slot>
      </div>

      <!-- Right tabs column (always present for spacing) -->
      <div class="flex flex-col justify-center gap-1 py-1 flex-shrink-0 tab-col-vertical overflow-y-auto">
        <button
          v-for="handle in handlesByPosition.right"
          :key="handle.id"
          @click="selectHandle(handle.id)"
          :class="[
            'side-tab rounded-r-md border-2 border-l-0 text-right',
            isSelected(handle.id)
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-900'
          ]"
          :title="handle.label || handle.id"
        >
          <span class="side-tab-label">{{ handle.label || handle.id }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom tabs row (always present for spacing) -->
    <div class="flex justify-center flex-shrink-0 tab-row-horizontal">
      <button
        v-for="handle in handlesByPosition.bottom"
        :key="handle.id"
        @click="selectHandle(handle.id)"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-b-lg border-2 border-t-0 transition-colors',
          isSelected(handle.id)
            ? 'bg-indigo-500 text-white border-indigo-500'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-900'
        ]"
        :title="handle.label || handle.id"
      >
        {{ handle.label || handle.id }}
      </button>
    </div>
  </div>
  <div v-else class="h-full">
    <slot></slot>
  </div>
</template>

<style scoped>
.port-tabs-container {
  padding: 0;
}

/* Reserve space for tabs even when empty */
.tab-row-horizontal {
  min-height: 36px;
}

/* Side tabs read horizontally (rotated vertical text was unreadable and
   collided once port names got long, e.g. ANSWER_QUESTION / STORE_FACT).
   Labels truncate with an ellipsis, the full name is in the title tooltip,
   and the column scrolls when a node has many ports on one side. */
.tab-col-vertical {
  max-height: 100%;
}

.side-tab {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  transition: colors 0.15s;
}

.side-tab-label {
  display: block;
  max-width: 7.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
