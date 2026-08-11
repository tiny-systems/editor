<!--
  Read-only rendering for prose a flow produced.

  A model's answer arrives as markdown and, until now, landed in a
  single-line text input: unreadable, unscrollable, and pretending to be
  editable. This renders it instead.

  The value is UNTRUSTED — it comes from an LLM, an HTTP response, a log
  line. So every character is escaped first and a small set of markdown
  constructs is then re-introduced from the escaped text. Nothing the value
  contains can become markup: no raw HTML passthrough, no attributes, no
  urls turned into links. That is a narrower feature than a real markdown
  parser and a much smaller thing to get wrong.
-->
<template>
  <div v-if="!value" class="md-empty">Nothing yet.</div>
  <div v-else class="md" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value?: string }>()

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Inline constructs, applied to already-escaped text.
const inline = (s: string) =>
  s.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')

const html = computed(() => {
  const text = escapeHtml(props.value || '')
  const out: string[] = []
  let list: string[] = []

  const flushList = () => {
    if (!list.length) return
    out.push('<ul>' + list.map(li => `<li>${inline(li)}</li>`).join('') + '</ul>')
    list = []
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/)

    if (bullet) {
      list.push(bullet[1])
      continue
    }
    flushList()

    if (!line.trim()) continue
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6) // never emit h1 inside a widget
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    out.push(`<p>${inline(line)}</p>`)
  }
  flushList()

  return out.join('')
})
</script>

<style scoped>
.md {
  max-height: 22rem;
  overflow-y: auto;
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #374151;
  overflow-wrap: anywhere;
}

.md-empty {
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  color: #9ca3af;
}

.md :deep(p) {
  margin: 0 0 0.5rem;
}

.md :deep(p:last-child) {
  margin-bottom: 0;
}

.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
  margin: 0.75rem 0 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.md :deep(ul) {
  margin: 0 0 0.5rem;
  padding-left: 1.125rem;
  list-style: disc;
}

.md :deep(li) {
  margin: 0.125rem 0;
}

.md :deep(code) {
  padding: 0.0625rem 0.25rem;
  border-radius: 0.1875rem;
  background: #f3f4f6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  .md {
    color: #d1d5db;
  }

  .md :deep(code) {
    background: #1f2937;
  }
}

:global(.dark) .md {
  color: #d1d5db;
}

:global(.dark) .md :deep(code) {
  background: #1f2937;
}
</style>
