<script lang="ts">
import type { PropType } from 'vue'
import * as common from './common'
import Editor from './Editor.vue'

export default {
  components: {
    editor: Editor
  },
  emits: ['lookup', 'update-value'],
  props: {
    schema: {
      type: Object as PropType<common.Schema>,
      required: true,
    },
    initialValue: null,
    locale: Object as PropType<common.Locale>,
    theme: null,
    readonly: Boolean,
    allowLookup: Boolean,
    hideRootLookup: Boolean,
    plainStruct: Boolean,
    noBorder: Boolean,
    disableCollapse: Boolean,
    allowEditSchema: Boolean,
    minItemCountIfNeedFilter: Number,
    hasDeleteButton: {
      type: Boolean,
      required: false,
    },
  },
  computed: {
    themeObject(): common.Theme {
      //@ts-ignore
      return common.getTheme(this.theme)
    },
    localeObject(): common.Locale {
      //@ts-ignore
      return common.getLocale(this.locale)
    }
  },
  methods: {
    // @ts-ignore
    getReference (name: string)  {
      // @ts-ignore
      if (this.schema.$defs) {
        // @ts-ignore
        return this.schema.$defs[name.substring('#/$defs/'.length)]
      }
      return undefined
    },
    lookup(...args: any[]) {
      this.$emit('lookup', ...args)
    },
    updateValue(...args: any[]) {
      this.$emit('update-value', ...args)
    }
  },
}
</script>
<template>
  <editor :schema="schema"
    :initial-value="initialValue"
    :getReference="getReference"
    :theme="themeObject"
    :locale="localeObject"
    :readonly="readonly"
    :allow-edit-schema="allowEditSchema"
    :required="true"
    :allow-lookup="allowLookup"
    :hide-root-lookup="hideRootLookup"
    :no-border="noBorder"
    :plain-struct="plainStruct"
    :has-delete-button="hasDeleteButton"
    :disableCollapse="disableCollapse"
    :minItemCountIfNeedFilter="minItemCountIfNeedFilter"
    @lookup="lookup"
    @update-value="updateValue">
  </editor>
</template>
<style>
</style>
