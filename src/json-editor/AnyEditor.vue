<template>
  <div :class="className">
    <div :class="theme.title">
      <div class="flex space-x-1 w-full">
        <div class="pl-1" v-if="titleToShow != ''">{{titleToShow}}</div>
        <div v-if="(allowEditSchema && schema.configurable) || schema.type">
          <div class="flex space-x-1 w-full relative">
            <button v-if="allowEditSchema && schema.configurable && !schema.configure && value !== undefined && !isReadOnly" @click="configureSchema()" title="Configure type" type="button" class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800">
              <PencilIcon></PencilIcon>
            </button>
            <button @click="applySchema" type="button" class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800" title="Apply schema changes" v-if="schema.configure && schema.configurable && allowEditSchema && dirty">
              <ArrowDownOnSquareIcon></ArrowDownOnSquareIcon>
            </button>
            <button ref="schemaBtnRef" @click="toggleSchemaPopover" type="button" class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800" title="Show schema" v-if="schema.configure && allowEditSchema">
              <CodeBracketIcon></CodeBracketIcon>
            </button>
            <Teleport to="body">
              <div v-if="showSchemaPopover" :style="schemaPopoverStyle" class="fixed z-[9999] flex flex-col h-60 p-3 w-64 text-xs font-light text-gray-500 bg-white rounded-lg border border-gray-200 shadow-lg dark:text-gray-300 dark:border-gray-600 dark:bg-gray-800">
                <textarea class="text-xs w-full h-full rounded-sm border border-indigo-500 focus:ring-0 resize-none dark:bg-black">{{schemaEdit}}</textarea>
                <button type="button" @click="copyContent(JSON.stringify(schemaEdit))" class="w-full mt-2 h-6 border border-indigo-500 dark:border-indigo-800 rounded-sm p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800">Copy JSON schema</button>
              </div>
            </Teleport>
            <button ref="importBtnRef" @click="toggleImportPopover" type="button" class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800" title="Import schema" v-if="schema.configure && allowEditSchema">
              <DocumentArrowUpIcon></DocumentArrowUpIcon>
            </button>
            <Teleport to="body">
              <div v-if="showImportPopover" :style="importPopoverStyle" class="fixed z-[9999] flex flex-col h-60 p-3 w-64 text-xs font-light text-gray-500 bg-white rounded-lg border border-gray-200 shadow-lg dark:text-gray-300 dark:border-gray-600 dark:bg-gray-800">
                <textarea v-model="localChangesStr" class="text-xs w-full h-full rounded-sm border border-indigo-500 focus:ring-0 resize-none dark:bg-black"></textarea>
                <button type="button" @click="importLocalChanges" class="w-full mt-2 h-6 border border-indigo-500 dark:border-indigo-800 rounded-sm p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800">Import JSON schema</button>
              </div>
            </Teleport>
            <button @click="discardChanges" type="button" class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800" title="Discard schema changes" v-if="schema.configure">
              <XMarkIcon></XMarkIcon>
            </button>
          </div>
        </div>
      </div>
      <div :class="theme.buttonGroup" :style="buttonGroupStyle">
        <optional :required="required" :value="value" :isReadOnly="isReadOnly"
                  :theme="theme" :locale="locale" @toggleOptional="toggleOptional()">
        </optional>
      </div>
      <div :class="theme.buttonGroup">
        <button v-if="hasDeleteButtonFunction" type="button" class="w-4 text-indigo-500 cursor-pointer ml-1" @click="$emit('delete')" title="Delete">
          <XCircleIcon></XCircleIcon>
        </button>
      </div>
    </div>
    <div v-if="allowLookup && (value !== undefined) && !isReadOnly" :class="['w-full text-left flex justify-between', deleteHover ? 'bg-red-100 dark:bg-red-900/50 border-0 rounded' : (hover ? 'bg-indigo-100 dark:bg-indigo-800 border-0 rounded' : '')]">
      <label class="text-indigo-500 text-xs pb-1 pl-1">{{expression}}</label>
      <div class="flex">
        <button @mouseover="hover = true" @mouseleave="hover = false" type="button" class="w-4 inline-block text-indigo-500 cursor-pointer" :title="expression ? 'Edit expression' : 'Apply expression'" @click="$emit('lookup', getAllValue(), schema, onChangeExpression)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </button>
        <button v-if="expression" type="button" class="w-4 inline-block text-red-500 cursor-pointer" @mouseover="deleteHover = true" @mouseleave="deleteHover = false" title="Clear expression" @click="clearExpression">
          <XCircleIcon></XCircleIcon>
        </button>
      </div>
    </div>
    <div v-if="allowEditSchema && schema.configure" class="border-2 rounded p-1 border-indigo-500 dark:border-indigo-800">
      <span class="text-xs dark:text-gray-500">Create your own schema.</span>
        <json-schema-editor class="mt-1" :value="schemaEdit" :root="true"></json-schema-editor>
        <p class="text-xs text-indigo-400 pt-5" v-if="dirty">Don't forget to apply your recent changes of schema.</p>
    </div>
    <description v-if="(allowEditSchema && schema.configurable) || schema.type" :theme="theme" :message="schema.description"></description>
    <code v-if="!schema.configure && !!expression && !allowLookup" class="text-xs p-1 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 w-full block font-mono" v-text="expression"></code>
    <vue-json-pretty v-else-if="!schema.configure && isObject" :data="value" :deep="2" :show-length="true" class="text-xs p-1 bg-blue-50 dark:bg-gray-800 w-full block overflow-auto max-h-96" />
    <code v-else-if="!schema.configure" class="text-xs p-1 bg-blue-50 dark:bg-blue-500 w-full block">{{value}}</code>
  </div>
</template>
<script lang="ts">
import {ref, defineComponent} from 'vue'
import type {PropType} from 'vue'
import * as common from './common'
import Optional from './Optional.vue'
import Description from './Description.vue'
import {
  XCircleIcon,
  XMarkIcon,
  ArrowDownOnSquareIcon,
  EyeIcon,
  CodeBracketIcon,
  DocumentArrowUpIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'
import { PencilIcon } from '@heroicons/vue/24/solid'
// Popover components removed - using Teleport + manual toggle to escape overflow clipping
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import Button from "./Button.vue";

export default defineComponent({
  emits: ['update-value', 'delete', 'lookup'],
  props: {
    schema: {
      type: Object as PropType<common.Schema>,
      required: true,
    },
    property: String,
    initialValue: null,
    title: [String, Number],
    theme: {
      type: Object as PropType<common.Theme>,
      required: true,
    },
    locale: {
      type: Object as PropType<common.Locale>,
      required: true,
    },
    allowLookup: Boolean,
    plainStruct: Boolean,
    readonly: Boolean,
    required: Boolean,
    allowEditSchema: Boolean,
    hasDeleteButton: {
      type: Boolean,
      required: false,
    }
  },
  data: () => {
    return {
      localChanges: null as any,
      dirty: false,
      expression: undefined as string | undefined,
      hover: false,
      deleteHover: false,
      importChanges: null as any,
      value: undefined as common.ValueType | undefined,
      buttonGroupStyle: common.buttonGroupStyleString,
      showSchemaPopover: false,
      showImportPopover: false,
      schemaPopoverPos: { top: 0, left: 0 },
      importPopoverPos: { top: 0, left: 0 },
    }
  },
  computed: {
    className(): string {
      const rowClass = this.theme.row
      return this.schema.className ? rowClass + ' ' + this.schema.className : rowClass
    },
    titleToShow(): string {
      return common.getTitle(this.schema.title, this.title)
    },
    isReadOnly(): boolean | undefined {
      return this.readonly || this.schema.readonly
    },
    hasDeleteButtonFunction(): boolean {
      return this.hasDeleteButton && !this.isReadOnly
    },
    isObject(): boolean {
      return this.value !== null && this.value !== undefined && typeof this.value === 'object'
    },
    schemaPopoverStyle(): Record<string, string> {
      return { top: `${this.schemaPopoverPos.top}px`, left: `${this.schemaPopoverPos.left}px` }
    },
    importPopoverStyle(): Record<string, string> {
      return { top: `${this.importPopoverPos.top}px`, left: `${this.importPopoverPos.left}px` }
    },
    localChangesStr: {
      get() {
        return JSON.stringify(this.localChanges)
      },
      set(v: string) {
        this.importChanges = JSON.parse(v)
      }
    },
    schemaEdit: {
      get() {
        if (this.localChanges) {
          return this.localChanges
        }
        const s = {}
        //@ts-ignore
        s[this.property] = Object.assign({}, this.schema);
        //@ts-ignore
        this.localChanges = s
        return this.localChanges
      },
      set(v: any) {
        this.localChanges = v
      },
    },
  },
  methods: {
    toggleSchemaPopover() {
      this.showImportPopover = false
      this.showSchemaPopover = !this.showSchemaPopover
      if (this.showSchemaPopover) {
        const btn = this.$refs.schemaBtnRef as HTMLElement | undefined
        if (btn) {
          const rect = btn.getBoundingClientRect()
          this.schemaPopoverPos = { top: rect.bottom + 4, left: rect.left }
        }
      }
    },
    toggleImportPopover() {
      this.showSchemaPopover = false
      this.showImportPopover = !this.showImportPopover
      if (this.showImportPopover) {
        const btn = this.$refs.importBtnRef as HTMLElement | undefined
        if (btn) {
          const rect = btn.getBoundingClientRect()
          this.importPopoverPos = { top: rect.bottom + 4, left: rect.left }
        }
      }
    },
    handlePopoverClickOutside(e: MouseEvent) {
      if (!this.showSchemaPopover && !this.showImportPopover) return
      const target = e.target as Node
      if (this.$el && this.$el.contains(target)) return
      const panels = document.querySelectorAll('.fixed.z-\\[9999\\]')
      for (const panel of panels) {
        if (panel.contains(target)) return
      }
      this.showSchemaPopover = false
      this.showImportPopover = false
    },
    importLocalChanges() {
      this.localChanges = this.importChanges
    },
    discardChanges() {
      //@ts-ignore
      this.localchanges = null
      //@ts-ignore
      Object.assign(this.schema,{configure: false})
      //@ts-ignore
      this.dirty = false
    },
    configureSchema() {
      //@ts-ignore
      this.schema.configure = true
      //@ts-ignore
      this.dirty = false
    },
    async copyContent (text: string) {
      try {
        await navigator.clipboard.writeText(text);
        console.log('content copied to clipboard');
        /* Resolved - text copied to clipboard successfully */
      } catch (err) {
        console.error('failed to copy: ', err);
      }
    },
    applySchema() {
      //@ts-ignore
      const val = Object.values(this.localChanges)[0]
      //@todo replace with emit
      //@ts-ignore
      const typeBefore = this.schema ? this.schema.type : ''
      //@ts-ignore
      Object.assign(this.schema, val, {configure: false})

      //@ts-ignore
      if (typeBefore != this.schema.type) {
        //reset value only if type changed
        this.$emit('update-value', {value: undefined, isValid: true})
      }
      //@ts-ignore
      if (this.schema && this.schema.type === '') {
        // empty schema means any
        //@ts-ignore
        delete this.schema['type']
      }
      //@ts-ignore
      this.dirty = false
    },
    //@ts-ignore
    getAllValue() {
      if (this.plainStruct || this.value === undefined) {
        return this.value
      }
      // New format: expression wrapped in {{expr}}, literals are plain values
      //@ts-ignore
      if (this.expression) {
        //@ts-ignore
        return `{{${this.expression}}}`
      }
      //@ts-ignore
      return this.value
    },
    emitValue() {
      //@ts-ignore
      this.$emit('update-value', { value: this.getAllValue(), isValid: true })
    },
    onChangeExpression(dataExpression: string) {
      //@ts-ignore
      this.expression = dataExpression
      this.emitValue()
    },
    getValue(): any {
      // For new {{expr}} format, extract actual value (not the expression wrapper)
      if (typeof this.initialValue === 'string') {
        const match = this.initialValue.match(/^\{\{(.+)\}\}$/)
        if (match) {
          // It's an expression - return empty object so field shows as "defined"
          // The actual expression is stored in this.expression
          return {}
        }
      }
      return common.getDefaultValue(this.required, this.schema, this.initialValue)
    },
    extractExpression(val: any): string | undefined {
      if (typeof val === 'string') {
        // New format: {{expression}}
        const match = val.match(/^\{\{(.+)\}\}$/)
        if (match) {
          return match[1]
        }
      }
      return undefined
    },
    clearExpression() {
      this.expression = undefined
      this.emitValue()
    },
    toggleOptional() {
      if (this.value !== undefined) {
        this.value = undefined
      } else {
        this.value = this.getValue()
      }
      this.emitValue()
    },
  },
  mounted() {
    document.addEventListener('click', this.handlePopoverClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handlePopoverClickOutside)
  },
  beforeMount() {
    //@ts-ignore
    this.expression = this.extractExpression(this.initialValue)
    //@ts-ignore
    this.value = this.getValue()
  },
  watch: {
    schemaEdit: {
      handler(newValue: any, oldValue: any) {
        //@ts-ignore
        this.dirty = true
      },
      deep: true
    }
  },
  components: {
    Button,
    ChevronDownIcon, ChevronRightIcon,
    XCircleIcon, XMarkIcon, ArrowDownOnSquareIcon, EyeIcon, CodeBracketIcon, PencilIcon, DocumentArrowUpIcon,
    Optional,
    Description,
    VueJsonPretty,
  }
})
</script>

