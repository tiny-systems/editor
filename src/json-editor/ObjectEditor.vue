<template>
  <template v-if="tableMode">
    <td v-for="(p, i) in properties">
      <editor
        v-if="isRequired(p.property) !== false"
        :property="p.property"
        :key="p.property"
        :schema="p.schema"
        :allow-edit-schema="allowEditSchema"
        :getReference="getReference"
        :initial-value="value?.[p.propertyName]"
        @update-value="onChange(p.propertyName, $event)"
        :theme="theme"
        @lookup="lookup"
        :allow-lookup="allowLookup"
        :plain-struct="plainStruct"
        :locale="locale"
        :required="isRequired(p.property)"
        :readonly="isReadOnly"
        :disable-collapse="disableCollapse"
        :minItemCountIfNeedFilter="minItemCountIfNeedFilter">
      </editor>
    </td>
    <td v-if="hasDeleteButtonFunction">
      <button type="button" class="w-4 text-indigo-500 cursor-pointer ml-1"
                @click="$emit('delete')" title="Delete">
      <XCircleIcon></XCircleIcon>
    </button></td>
  </template>
  <div v-else :class="className">
    <div :class="[theme.title, !titleToShow ? 'border-none' : '']">
      <div class="flex space-x-1 w-full">
        <div class="pl-1" v-if="titleToShow != ''">{{ titleToShow }}</div>
        <button v-if="allowEditSchema && schema.configurable && value !== undefined && !isReadOnly" @click="configureSchema()"
                title="Configure type" type="button"
                class="w-6 h-6 border border-indigo-500 dark:border-indigo-800  rounded p-1 button inline-block cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800">
          <PencilIcon></PencilIcon>
        </button>
      </div>
      <optional :required="required"
                :value="value"
                :isReadOnly="isReadOnly"
                :theme="theme"
                :locale="locale"
                @toggleOptional="toggleOptional()">
      </optional>
      <button v-if="hasDeleteButtonFunction" type="button" class="w-4 text-indigo-500 cursor-pointer ml-1"
              @click="$emit('delete')" title="Delete">
        <XCircleIcon></XCircleIcon>
      </button>
    </div>
    <div :class="['flex justify-between', deleteHover ? 'bg-red-100 dark:bg-red-900/50 border-0 rounded' : (hover ? 'bg-indigo-100 dark:bg-indigo-800 border-0 rounded' : '')]">
      <div v-if="value !== undefined"
           :class="[theme.card, noBorder ? '' : 'border', (!!expression ? 'mx-1 rounded-lg dark:border-indigo-800' : 'rounded-lg dark:border-gray-800')]">
        <div class="w-full">
          <nav v-if="tabs.length > 0" class="relative z-0 my-2 px-1 justify-between rounded-lg dark:border-gray-600 flex" aria-label="Tabs">
            <a v-for="(p, i) in tabs"  @click.prevent="currentTab = p" :key="i" href="#" :class="['text-gray-500 dark:text-gray-300 rounded-lg', current == p ? 'bg-gray-100 dark:bg-gray-800' : '', 'relative min-w-0 flex-1 overflow-hidden  py-2 px-2 mx-2 text-sm font-medium text-center focus:z-10 whitespace-nowrap']"
               :aria-current="'page'">
              <span>{{ p }}</span>
            </a>
          </nav>
        </div>
        <div :class="['grid grid-flow-row-dense grid-cols-12 w-full gap-1']">
          <div v-if="!!expression" class="text-indigo-500 text-xs pb-1 col-span-12">{{ expression }}</div>
          <p class="text-xs col-span-12 text-center p-2 dark:text-gray-500 flex justify-center"
             v-if="properties.length === 0 && !expression && schema.configurable && !isReadOnly">Empty — add your own properties by clicking<PencilIcon class="w-3 mx-2 h-3"></PencilIcon>
          </p>
            <div v-for="(p, i) in properties" v-show="!expression"
                 :class="[(tabs.length > 0 ? ( getMerged(p.schema).tab == current ? 'block' : 'hidden') : 'block'),  'break-inside-avoid-column' + (getMerged(p.schema.align) ? ' text-' + getMerged(p.schema).align : '') + (getMerged(p.schema).colSpan ? ' ' + getMerged(p.schema).colSpan : ' col-span-12')]">
              <editor
                v-if="isRequired(p.property) !== false"
                :property="p.property"
                :key="p.property"
                :schema="p.schema"
                :allow-edit-schema="allowEditSchema"
                :title="p.schema.title || p.propertyName"
                :getReference="getReference"
                :initial-value="value[p.propertyName]"
                @update-value="onChange(p.propertyName, $event)"
                :theme="theme"
                @lookup="lookup"
                :allow-lookup="allowLookup"
                :plain-struct="plainStruct"
                :locale="locale"
                :required="isRequired(p.property)"
                :readonly="isReadOnly"
                :disable-collapse="disableCollapse"
                :minItemCountIfNeedFilter="minItemCountIfNeedFilter">
              </editor>
          </div>
        </div>
      </div>
      <div v-if="allowLookup && !hideRootLookup && value !== undefined && !isReadOnly">
        <button type="button" @mouseover="hover = true" @mouseleave="hover = false"
                class="w-4 text-indigo-500 cursor-pointer"
                @click="$emit('lookup', getAllValue(), schema, onChangeExpression)" :title="expression ? 'Edit expression' : 'Apply expression'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
               stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/>
          </svg>
        </button>
        <button v-if="expression" type="button" class="w-4 text-red-500 cursor-pointer" @mouseover="deleteHover = true" @mouseleave="deleteHover = false" @click="clearExpression" title="Clear expression">
          <XCircleIcon></XCircleIcon>
        </button>
      </div>
    </div>
    <description :theme="theme" :message="schema.description"></description>
    <description :theme="theme" :message="errorMessage"></description>
  </div>
</template>
<script lang="ts">
import {defineComponent, defineAsyncComponent} from 'vue'
import type {PropType} from 'vue'
import * as common from './common'
import Optional from './Optional.vue'
import Description from './Description.vue'

const Editor = defineAsyncComponent(() => import('./Editor.vue') as any)
import {ChevronDownIcon, ChevronRightIcon, PencilIcon, XCircleIcon} from '@heroicons/vue/24/solid'

const getUniqueValues = (array: any[]) => (
  array.reduce((accumulator, currentValue) => (
    accumulator.includes(currentValue) ? accumulator : [...accumulator, currentValue]
  ), [])
)

export default defineComponent({
  emits: ['update-value', 'delete', 'lookup'],
  components: {
    XCircleIcon, PencilIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    optional: Optional,
    description: Description,
    editor: Editor
  },
  props: {
    schema: {
      type: Object as PropType<common.ObjectSchema>,
      required: true,
    },
    allowLookup: Boolean,
    hideRootLookup: Boolean,
    plainStruct: Boolean,
    noBorder: Boolean,
    initialValue: null,
    title: [String, Number],
    getReference: {
      type: Function as unknown as PropType<(ref: string) => common.Schema | undefined>,
      required: true,
    },
    theme: {
      type: Object as PropType<common.Theme>,
      required: true,
    },
    locale: {
      type: Object as PropType<common.Locale>,
      required: true,
    },
    tableMode: Boolean,
    allowEditSchema: Boolean,
    readonly: Boolean,
    required: Boolean,
    hasDeleteButton: {
      type: Boolean,
      required: false,
    },
    disableCollapse: Boolean,
    minItemCountIfNeedFilter: Number
  },
  data: () => {
    return {
      value: {} as { [name: string]: common.ValueType } | undefined,
      isAction: false,
      expression: undefined as string | undefined,
      errorMessage: '' as string | undefined,
      filter: '',
      hover: false,
      deleteHover: false,
      invalidProperties: [] as string[],
      properties: [] as { property: string; schema: common.Schema; propertyName: string }[],
      watchedProperties: [] as string[],
      currentTab: '',
    }
  },
  beforeMount() {
    this.value = this.getValue() as { [name: string]: common.ValueType } | undefined
    this.expression = this.extractExpression(this.initialValue)
    this.validate()
    if (this.schema.properties) {
      for (const property in this.schema.properties) {
        if (this.schema.properties.hasOwnProperty(property)) {
          const schema = this.schema.properties[property]!
          const propertyName = schema.propertyName || property
          this.properties.push({
            propertyName,
            property,
            schema
          })
        }
      }
    }
    this.properties.sort(common.compare)

    // Map-style objects (additionalProperties with no fixed properties — e.g.
    // a code node's inputData/outputData example) rendered NOTHING before:
    // this loop only reads schema.properties. Render one row per value key,
    // typed by the additionalProperties schema, so the saved example shows as
    // a real form instead of a blank section. Read/edit VALUES only — keys
    // are added or removed through the schema editor (pencil), which saves an
    // explicit schema and turns these into fixed properties.
    if (this.mapEntrySchema && this.value) {
      const fixed = new Set(this.properties.map(p => p.propertyName))
      Object.keys(this.value).filter(k => !fixed.has(k)).sort().forEach(k => {
        this.properties.push({
          property: k,
          propertyName: k,
          schema: {...this.mapEntrySchema} as common.Schema,
        })
      })
    }

    if (this.schema.properties) {
      for (const property in this.schema.properties) {
        const schema = this.schema.properties[property]
        if (schema && schema.requiredWhen && !this.watchedProperties.includes(schema.requiredWhen[0])) {
          this.watchedProperties.push(schema.requiredWhen[0])
        }
      }
    }
    if (this.value !== undefined) {
      this.emitValue()
    }
  },
  computed: {
    tabs(): string[] {

      let tabs: string[] = []
      for (const p in this.properties) {
        const prop = this.properties[p]
        if (prop && this.getMerged(prop.schema)?.tab) {
          // we have ref, resolve
          tabs.push(this.getMerged(prop.schema).tab)
        }
      }
      return getUniqueValues(tabs)
    },
    current(): string {
      // @ts-ignore
      if (this.currentTab) {
        return this.currentTab
      }
      if (this.tabs.length > 0) {
        // @ts-ignore
        return this.tabs[0]
      }
      return ''
    },
    isReadOnly(): boolean | undefined {
      return this.readonly || this.schema.readonly
    },
    // Set when this object is map-style: additionalProperties carries an
    // entry schema (object form, not the boolean form). Drives per-key
    // rendering and the add/remove entry controls.
    mapEntrySchema(): common.Schema | undefined {
      const ap: any = (this.schema as any).additionalProperties
      return ap && typeof ap === 'object' ? ap as common.Schema : undefined
    },
    hasDeleteButtonFunction(): boolean {
      return this.hasDeleteButton && !this.isReadOnly
    },
    titleToShow(): string {
      if (this.hasDeleteButton) {
        return common.getTitle(common.findTitle(this.value, this.properties), this.title, this.schema.title)
      }
      return common.getTitle(this.schema.title, this.title)
    },

    className(): string {
      const rowClass = this.errorMessage ? this.theme.errorRow : this.theme.row
      return rowClass
    },
  },
  methods: {
    toggleOptional() {
      if (this.value !== undefined) {
        this.value = undefined
      } else {
        this.value = this.getValue() as { [name: string]: any } | undefined
      }
      this.emitValue()
    },
    getMerged(schema: any) {
      if (!schema) {
        return schema
      }
      if (!schema.$ref) {
        return schema
      }
      return Object.assign({}, this.getReference(schema.$ref) || {}, schema)
    },
    configureSchema() {
      this.schema.configure = true
    },
    lookup(data: any, schema: any, cb: any) {
      this.$emit('lookup', data, schema, cb)
    },
    isRequired(property: string) {
      return common.isRequired(this.schema.required, this.value, this.schema, property)
    },
    onChangeExpression(expression: string) {
      this.expression = expression
      this.emitValue()
    },
    onChange(property: string, {value, isValid, isAction}: common.ValidityValue<common.ValueType>) {
      this.value![property] = value
      this.isAction = isAction
      for (const p in this.schema.properties) {
        if (this.isRequired(p) === false) {
          this.value![p] = undefined
        }
      }
      for (const p in this.value) {
        // Never prune keys of a map-style object — its entries are by
        // definition not in schema.properties.
        if (this.schema.properties && !this.schema.properties.hasOwnProperty(p) && !this.mapEntrySchema) {
          delete this.value![p]
        }
      }

      this.validate()
      if (this.watchedProperties.some(p => p === property)) {
        this.$forceUpdate()
      }
      common.recordInvalidPropertiesOfObject(this.invalidProperties, isValid, property)
      this.emitValue()
    },
    onFilterChange(e: { target: { value: string } }) {
      this.filter = e.target.value
    },
    getAllValue() {
      if (this.value === undefined || this.plainStruct) {
        return this.value
      }
      // New format: expression wrapped in {{expr}}, literals are plain values
      if (this.expression) {
        return `{{${this.expression}}}`
      }
      return this.value || {}
    },
    getValue(): common.ValueType {
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
      this.validate()
      this.emitValue()
    },
    emitValue() {
      this.$emit('update-value', {
        value: this.getAllValue(),
        isValid: this.invalidProperties.length === 0,
        isAction: this.isAction
      })
    },
    validate() {
      this.errorMessage = common.getErrorMessageOfObject(this.value, this.schema, this.locale)
    },
  },
  watch: {},
})
</script>
<style scoped>
.col-span-4 {
  grid-column: span 4 / span 4;
}

.col-span-5 {
  grid-column: span 5 / span 5;
}

.col-span-6 {
  grid-column: span 6 / span 6;
}
</style>
