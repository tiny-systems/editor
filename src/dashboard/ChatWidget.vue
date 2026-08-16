<!--
  ChatWidget — the renderer for a chat component's control widget
  (schema format: "chat"). A conversation, not a form: human bubbles right,
  the flow's replies left as markdown, the flow's questions as inline cards
  whose form is the ask's JSON Schema, expiry/system notes as quiet center
  lines. Everything dynamic rides in the widget DATA (thread, pendingQuestion);
  the schema is only the dispatch marker plus a fallback form for hosts
  without this renderer.

  Submissions go through the same control channel as every widget:
  emit('send', payload) → runAction on the node's _control port, tagged
  {_kind: "message"|"answer"} for the component.
-->
<template>
  <!-- FORM MODE (data.hideComposer): a settings-style surface. Just the
       pending question's form — no card banner, no thread history, no
       composer. A stored value shows as a quiet "Current: ••••last4" line
       (the flow passes it in the ask context), and the latest say note
       (saved ✓ / validation error) renders under the form. -->
  <div v-if="data?.hideComposer" class="p-4 space-y-3">
    <template v-if="pendingQuestion">
      <p v-if="pendingQuestion.context && pendingQuestion.context.current"
         class="text-xs text-gray-500 dark:text-gray-400">
        Current: <span class="font-mono">{{ pendingQuestion.context.current }}</span>
      </p>
      <json-editor
        :schema="questionSchema"
        :key="pendingQuestion.qid"
        :initial-value="{}"
        :plain-struct="true"
        no-border
        :has-delete-button="false"
        :allow-edit-schema="false"
        :allow-lookup="false"
        :disable-collapse="true"
        :readonly="readonly"
        :locale="locale"
        class="w-full"
        @update-value="onQuestionValue"
      />
    </template>
    <p v-else class="text-sm text-gray-400 dark:text-gray-600">Nothing to configure right now.</p>
    <p v-if="latestNote"
       :class="['text-xs', latestNote.role === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400']">
      {{ latestNote.text }}
    </p>
  </div>

  <div v-else class="flex flex-col h-full min-h-[16rem]">
    <!-- Thread -->
    <div ref="scroller" class="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-2">
      <div v-if="thread.length === 0" class="h-full flex items-center justify-center">
        <p class="text-xs text-gray-400 dark:text-gray-600 select-none">{{ emptyLine }}</p>
      </div>

      <template v-for="entry in thread" :key="entry.id">
        <!-- Human message. "Working…" dots animate only under the NEWEST
             pending message — a message the flow never answered (e.g. it
             errored into an unwired port) would otherwise shimmer forever.
             Older unanswered messages get a quiet static mark instead. -->
        <div v-if="entry.kind === 'message'" class="flex justify-end">
          <div class="max-w-[85%]">
            <div class="rounded-2xl rounded-br-sm bg-indigo-500 dark:bg-indigo-600 text-white px-3.5 py-2 text-sm whitespace-pre-wrap break-words">{{ entry.text }}</div>
            <div v-if="entry.pending && entry.id === lastPendingId" class="flex items-center justify-end gap-1.5 pt-1 pr-1">
              <span class="typing-dot"></span><span class="typing-dot" style="animation-delay:.18s"></span><span class="typing-dot" style="animation-delay:.36s"></span>
            </div>
            <div v-else-if="entry.pending" class="pt-0.5 pr-1 text-right text-[10px] text-gray-400 dark:text-gray-600 select-none" title="The flow never replied to this message">no reply</div>
          </div>
        </div>

        <!-- Flow reply -->
        <div v-else-if="entry.kind === 'reply' && entry.role === 'assistant'" class="flex">
          <div class="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-800 dark:text-gray-200">
            <markdown-view :value="entry.text" />
          </div>
        </div>

        <!-- Error / system notes (reply roles and expiry notes alike) -->
        <div v-else-if="isNote(entry)" class="flex justify-center">
          <p :class="['text-[11px] px-2 py-0.5 rounded-full',
                      entry.role === 'error'
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60']">{{ entry.text }}</p>
        </div>

        <!-- Question asked by the flow -->
        <div v-else-if="entry.kind === 'question'" class="flex">
          <div class="max-w-[92%] w-full">
            <!-- The live card: only for the question currently at the head -->
            <div v-if="entry.pending && pendingQuestion && pendingQuestion.qid === entry.qid"
                 class="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
              <div class="px-3 py-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400 border-b border-amber-200/70 dark:border-amber-500/20">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Needs your decision
                <span v-if="pendingQuestion.waiting > 0" class="ml-auto normal-case font-normal text-amber-600/80 dark:text-amber-500/80">+{{ pendingQuestion.waiting }} waiting</span>
              </div>
              <div v-if="hasContext" class="px-3 pt-2">
                <pre class="text-[11px] leading-snug font-mono text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-900/40 rounded-md p-2 overflow-x-auto">{{ contextPreview }}</pre>
              </div>
              <json-editor
                :schema="questionSchema"
                :key="pendingQuestion.qid"
                :initial-value="{}"
                :plain-struct="true"
                no-border
                :has-delete-button="false"
                :allow-edit-schema="false"
                :allow-lookup="false"
                :disable-collapse="true"
                :readonly="readonly"
                :locale="locale"
                class="w-full px-1"
                @update-value="onQuestionValue"
              />
            </div>
            <!-- A question already answered or superseded: quiet record -->
            <div v-else class="text-[11px] text-gray-400 dark:text-gray-600 px-1">
              question {{ entry.pending ? 'waiting…' : 'answered' }}
            </div>
          </div>
        </div>

        <!-- Human's answer to a question -->
        <div v-else-if="entry.kind === 'answer'" class="flex justify-end">
          <div class="max-w-[85%] flex flex-wrap gap-1 justify-end">
            <span v-for="(v, k) in buttonlessValues(entry.values)" :key="k"
                  class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-mono">{{ k }}: {{ short(v) }}</span>
            <span v-for="k in pressedButtons(entry.values)" :key="'b-' + k"
                  class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500 text-white capitalize">{{ k }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Composer. Hidden in form mode (data.hideComposer) — settings-style
         surfaces where the flow drives every question and free text has no
         receiver. -->
    <div v-if="!data?.hideComposer" class="px-3 pb-3 pt-1">
      <form @submit.prevent="send" class="flex items-end gap-2">
        <textarea
          ref="composer"
          v-model="draft"
          :placeholder="placeholder"
          :disabled="readonly"
          rows="1"
          class="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 focus:border-transparent disabled:opacity-50"
          @keydown.enter.exact.prevent="send"
          @input="autosize"
        ></textarea>
        <button type="submit"
                :disabled="readonly || !draft.trim()"
                class="shrink-0 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 transition-colors"
                title="Send (Enter)">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue'
import JsonEditor from '../json-editor/JSONEditor.vue'
import MarkdownView from '../json-editor/MarkdownView.vue'

export default defineComponent({
  name: 'ChatWidget',
  components: { 'json-editor': JsonEditor, 'markdown-view': MarkdownView },
  props: {
    // The widget's control DATA: { thread, pendingQuestion?, placeholder? }
    data: { type: Object, default: () => ({}) },
    readonly: { type: Boolean, default: false },
    locale: { type: Object, default: undefined }
  },
  emits: ['send'],
  data() {
    return {
      draft: '',
      // Optimistic echo. A sent message reaches the server thread only after
      // a full round-trip (runAction → component → a status patch the SDK
      // debounces ~1s trailing → stream) — with a fast model the reply lands
      // in the SAME patch, so without an echo your own bubble and the answer
      // appear together. Each entry carries expectCount: the number of
      // same-text server messages that proves the server has caught up.
      localEcho: [] as any[]
    }
  },
  computed: {
    serverThread(): any[] {
      const t = this.data?.thread
      return Array.isArray(t) ? t : []
    },
    thread(): any[] {
      const server = this.serverThread
      const live = this.localEcho.filter(
        (e: any) => server.filter((m: any) => m.kind === 'message' && m.text === e.text).length < e.expectCount
      )
      return live.length ? server.concat(live) : server
    },
    pendingQuestion(): any | null {
      return this.data?.pendingQuestion || null
    },
    // The newest unanswered human message — the only one that earns the
    // animated "working…" dots.
    lastPendingId(): string | null {
      for (let i = this.thread.length - 1; i >= 0; i--) {
        const e = this.thread[i]
        if (e.kind === 'message' && e.pending) return e.id
      }
      return null
    },
    placeholder(): string {
      return this.data?.placeholder || 'Message the agent…'
    },
    emptyLine(): string {
      return this.pendingQuestion ? '' : 'No messages yet.'
    },
    hasContext(): boolean {
      const c = this.pendingQuestion?.context
      return c !== undefined && c !== null && !(typeof c === 'object' && Object.keys(c).length === 0)
    },
    contextPreview(): string {
      try {
        const c = this.pendingQuestion?.context
        return typeof c === 'string' ? c : JSON.stringify(c, null, 1)
      } catch {
        return ''
      }
    },
    questionSchema(): any {
      return this.pendingQuestion?.form || { type: 'object', properties: {} }
    },
    // Form mode: the newest say note (saved ✓ / validation error) — the only
    // piece of the thread that surface shows.
    latestNote(): any | null {
      const t = this.thread
      for (let i = t.length - 1; i >= 0; i--) {
        const e = t[i]
        if (e.kind === 'reply' || e.kind === 'note') return e
      }
      return null
    }
  },
  watch: {
    thread: {
      handler() { this.scrollToEnd() },
      deep: false
    },
    // Prune echoes the server thread has absorbed, so they don't linger as
    // stale array entries (the thread computed already hides them).
    serverThread(server: any[]) {
      if (!this.localEcho.length) return
      this.localEcho = this.localEcho.filter(
        (e: any) => server.filter((m: any) => m.kind === 'message' && m.text === e.text).length < e.expectCount
      )
    },
    pendingQuestion() { this.scrollToEnd() }
  },
  mounted() { this.scrollToEnd() },
  methods: {
    isNote(entry: any): boolean {
      return entry.kind === 'note' || (entry.kind === 'reply' && entry.role !== 'assistant')
    },
    send() {
      const text = this.draft.trim()
      if (!text || this.readonly) return
      // Echo the message into the thread immediately; the server copy
      // replaces it when the status round-trip lands (see localEcho).
      const already = this.serverThread.filter((m: any) => m.kind === 'message' && m.text === text).length
      this.localEcho.push({
        id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        kind: 'message',
        text,
        pending: true,
        expectCount: already + 1
      })
      this.$emit('send', { _kind: 'message', text })
      this.draft = ''
      nextTick(() => this.autosize())
    },
    // The question card's form: a pressed button is the submission.
    onQuestionValue(e: any) {
      if (!e?.isAction || !this.pendingQuestion) return
      const values = (e.value && typeof e.value === 'object') ? e.value : {}
      this.$emit('send', { _kind: 'answer', _qid: this.pendingQuestion.qid, ...values })
    },
    buttonlessValues(values: any): Record<string, any> {
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(values || {})) {
        if (typeof v === 'boolean') continue
        if (v === '' || v === null || v === undefined) continue
        out[k] = v
      }
      return out
    },
    pressedButtons(values: any): string[] {
      return Object.entries(values || {}).filter(([, v]) => v === true).map(([k]) => k)
    },
    short(v: any): string {
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      return s.length > 40 ? s.slice(0, 37) + '…' : s
    },
    scrollToEnd() {
      nextTick(() => {
        const el = this.$refs.scroller as HTMLElement | undefined
        if (el) el.scrollTop = el.scrollHeight
      })
    },
    autosize() {
      const el = this.$refs.composer as HTMLTextAreaElement | undefined
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }
})
</script>

<style scoped>
.typing-dot {
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background-color: rgb(129 140 248); /* indigo-400 */
  display: inline-block;
  animation: chat-typing 1.1s ease-in-out infinite;
}
@keyframes chat-typing {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
</style>
