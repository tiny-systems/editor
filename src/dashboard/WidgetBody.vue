<!--
  WidgetBody — the shared renderer for one widget's content, used by both
  widget surfaces (the dashboard's Widgets tab and the Agent page). One
  renderer, two homes.

  Dispatch: no published schema yet → pending note; schema stamped
  format:"chat" → ChatWidget conversation; anything else → JSONEditor form.

  It also owns the per-widget render freeze. The form is keyed on the
  widget's DATA so an incoming answer rebuilds it — but a rebuild
  mid-interaction discards what was typed and unmounts the submit button
  under an in-flight click. So the key freezes while the person is engaged
  (a field focused, or an edit within the last few seconds) and tracks the
  data otherwise. Chat widgets keep their own state (composer, scroll) and
  are never re-keyed — data flows in as a reactive prop.

  Emits ('signal', event) for anything the person submits; the surface owns
  the transport (sendSignal → runAction on the node's control port). Chat
  submissions carry `chat: true` so the surface can skip the "Sent" toast —
  the thread shows its own pending state.
-->
<template>
  <div class="w-full h-full" @focusin="onFocusIn" @focusout="onFocusOut">
    <!-- A widget's form is built from its node's published port schema,
         which only exists once the node has reconciled. Freshly installed
         widgets therefore render as blank panels for a while, which reads
         as broken rather than as pending. -->
    <div v-if="!hasSchema"
         class="flex items-center gap-2 p-4 text-sm text-gray-500 dark:text-gray-400">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600 dark:border-t-transparent"></span>
      Waiting for the node to start — its form appears once the module is running.
    </div>
    <ChatWidget
      v-else-if="isChat"
      :data="widget.data"
      :readonly="readonly"
      :locale="locale"
      class="w-full h-full"
      @send="onChatSend"
    />
    <JsonEditor
      v-else
      :schema="schema"
      :key="stamp"
      @update-value="onValue"
      :has-delete-button="false"
      :plain-struct="true"
      class="w-full"
      no-border
      :allow-edit-schema="false"
      :allow-lookup="false"
      :initial-value="widget.data"
      :disable-collapse="true"
      :locale="locale"
      :readonly="readonly"
    />
    <div v-if="busy"
         class="flex items-center gap-2 p-2 text-sm text-gray-500 dark:text-gray-400">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600 dark:border-t-transparent"></span>
      working…
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ChatWidget from './ChatWidget.vue'
import { default as JsonEditor } from '../json-editor/JSONEditor.vue'
import { getWidgetSchema, widgetHasSchema, isChatWidget } from './widget-schema'

const props = withDefaults(
  defineProps<{
    widget: any
    locale?: any
    readonly?: boolean
  }>(),
  { readonly: false }
)

const emit = defineEmits<{
  (e: 'signal', event: any): void
}>()

const hasSchema = computed(() => widgetHasSchema(props.widget))
const isChat = computed(() => isChatWidget(props.widget))
const schema = computed(() => getWidgetSchema(props.widget))

// --- Submit feedback ------------------------------------------------------
// The flow answers by publishing new widget data; busy bridges the gap. The
// timer is a floor under that promise: a flow that never answers must not
// leave the widget spinning forever.
const BUSY_TIMEOUT_MS = 30000
const busy = ref(false)
let busyTimer: ReturnType<typeof setTimeout> | null = null

watch(busy, (value) => {
  if (busyTimer) {
    clearTimeout(busyTimer)
    busyTimer = null
  }
  if (value) {
    busyTimer = setTimeout(() => {
      busy.value = false
    }, BUSY_TIMEOUT_MS)
  }
})

watch(() => props.widget.data, () => {
  busy.value = false
})

// --- Render freeze -------------------------------------------------------
// focused: a field inside this widget has focus. focusout fires before
// focusin when moving between fields of the same form, so release settles on
// a short timer rather than dropping the freeze between every keystroke and
// the submit button.
const focused = ref(false)
let releaseFocusTimer: ReturnType<typeof setTimeout> | null = null

const onFocusIn = () => {
  if (releaseFocusTimer) clearTimeout(releaseFocusTimer)
  focused.value = true
}

const onFocusOut = () => {
  if (releaseFocusTimer) clearTimeout(releaseFocusTimer)
  releaseFocusTimer = setTimeout(() => {
    focused.value = false
  }, 150)
}

// Any local edit also freezes the form briefly. Focus events are the obvious
// signal, but they do not fire for every way a value can change, and the
// failure they guard against is severe: an incoming update rebuilds the form
// mid-interaction, discarding what was typed and removing the submit button
// before the click lands.
const EDIT_FREEZE_MS = 4000
const lastEdit = ref(0)
const nowTick = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  nowTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
  if (releaseFocusTimer) {
    clearTimeout(releaseFocusTimer)
    releaseFocusTimer = null
  }
  if (busyTimer) {
    clearTimeout(busyTimer)
    busyTimer = null
  }
})

// The stamp is the form's :key. When it changes, the form rebuilds from the
// node's freshly published data. Frozen while the person is engaged; keyed on
// the DATA otherwise — a node republishes its control port on every reconcile
// tick with identical data, so keying on time rebuilt the widget on each of
// those and clicks missed. Keying on the data means a rebuild happens only
// when the data actually changes — e.g. an answer returns.
const stamp = computed(() => {
  if (focused.value) return 'editing'
  if (lastEdit.value && nowTick.value - lastEdit.value < EDIT_FREEZE_MS) return 'editing'
  try {
    return JSON.stringify(props.widget.Data ?? props.widget.data ?? {})
  } catch {
    return props.widget._updateTime || 0
  }
})

// A form emitted a value. Two cases:
//   - isAction (a button press / submit): a COMMIT. The click has already
//     landed, so there is nothing left to protect — release the freeze at
//     once so the response can stream back and rebuild the widget.
//   - anything else: a keystroke. Arm the freeze so an incoming update does
//     not rebuild the form out from under the person mid-typing.
const onValue = (event: any) => {
  if (event?.isAction) {
    focused.value = false
    lastEdit.value = 0
    busy.value = true
  } else {
    lastEdit.value = Date.now()
  }
  emit('signal', event)
}

// No busy here — chat widgets render their own typing indicator.
const onChatSend = (value: any) => {
  emit('signal', { isAction: true, value, chat: true })
}
</script>
