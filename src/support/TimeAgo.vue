<template>
  <span>{{ displayText }}</span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  datetime: Date | number | string
  autoUpdate?: boolean | number
}>()

const now = ref(Date.now())
let intervalId: ReturnType<typeof setInterval> | null = null

const timestamp = computed(() => {
  if (props.datetime instanceof Date) {
    return props.datetime.getTime()
  }
  if (typeof props.datetime === 'number') {
    return props.datetime
  }
  return new Date(props.datetime).getTime()
})

const displayText = computed(() => {
  const diff = now.value - timestamp.value
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return seconds + ' seconds ago'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return minutes + ' minutes ago'
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return hours + ' hours ago'
  if (days === 1) return 'yesterday'
  if (days < 30) return days + ' days ago'
  if (months === 1) return '1 month ago'
  if (months < 12) return months + ' months ago'
  if (years === 1) return '1 year ago'
  return years + ' years ago'
})

const startAutoUpdate = () => {
  if (intervalId) {
    clearInterval(intervalId)
  }
  if (props.autoUpdate) {
    const interval = typeof props.autoUpdate === 'number' ? props.autoUpdate : 60000
    intervalId = setInterval(() => {
      now.value = Date.now()
    }, interval)
  }
}

watch(() => props.autoUpdate, () => {
  startAutoUpdate()
})

onMounted(() => {
  startAutoUpdate()
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
