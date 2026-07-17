<template>
  <button
    type="button"
    class="text-sm rounded m-1"
    :class="{
      'px-6 py-3': size === 'lg',
      'px-4 py-2': size === 'md',
      'px-2': size === 'sm',
      'border-indigo-200 text-gray-700 border hover:border-indigo-400 dark:border-gray-700 dark:text-gray-300':
        variant === 'primary',
      'border-red-100 border text-red-400 hover:border-red-400 dark:border-gray-700':
        variant === 'error'
    }"
  >
    <slot />
  </button>
</template>
<script setup>
const props = defineProps({
  size: {
    type: String, // sm | md | lg
    default: "md",
  },
  variant: {
    type: String, // primary | error
    default: "primary",
  },
  outline: Boolean,
});
</script>
