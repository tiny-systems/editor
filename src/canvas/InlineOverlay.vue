<template>
  <div class="absolute -inset-4 z-10 flex items-center justify-center bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm rounded-lg">
    <div :class="[mini ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow-xl', 'p-4 mx-4 flex items-center gap-3']">
      <!-- loading icon -->
      <svg v-if="!hideLoading" class="animate-spin h-5 w-5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none"
           viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
        </path>
      </svg>
      <!-- end loading icon -->
      <div class="text-sm text-gray-700 dark:text-gray-300"><slot></slot></div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  hideLoading: Boolean,
  mini: true
})
</script>
