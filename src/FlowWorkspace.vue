<template>
  <div class="flex flex-col h-full">
    <!-- Control Panel -->
    <ControlPanel
      v-if="flow && project"
      :flow="flow"
      :project="project"
    />


    <!-- Main content -->
    <div class="flex-1 relative z-0 flex overflow-hidden flex-col xl:flex-row">
      <!-- Editor area -->
      <main class="flex-1 relative z-0 overflow-y-auto focus:outline-none flex flex-col xl:w-1/2">
        <div class="relative w-full h-full">
          <!-- Trace indicator at top -->
          <Trace v-if="flow && project && store.trace" :trace="store.trace" :project-name="project.ResourceName" @close="loadTrace(null)" />

          <!-- Add component modal -->
          <FlowAddComponent
            v-if="flow && project && showAddComponent"
            v-model="showAddComponent"
            :flow-name="flow.ResourceName"
            :project-name="project.ResourceName"
            :position="newNodePosition"
          />

          <!-- Flow editor canvas -->
          <FlowEditor
            @add-node="handleAddNode"
            @configure-edge="handleConfigureEdge"
            @delete-node="handleDeleteNode"
            @delete-edge="handleDeleteEdge"
          />

          <!-- Disconnected overlay -->
          <InlineOverlay v-if="!connected" hide-loading>
            <div class="flex items-center gap-3">
              <span class="text-red-500 dark:text-red-400">Disconnected. {{ error }}</span>
              <button class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium" @click="loadFlow">
                Reload
              </button>
            </div>
          </InlineOverlay>
        </div>


      </main>

      <!-- Side panel - Edge configuration -->
      <aside
        v-if="flow && store.selectedEdge && store.selectedEdgeData && store.selectedNodes.length === 0"
        class="relative text-sm xl:flex xl:flex-col dark:text-gray-300 flex-shrink-0 xl:w-2/3 w-full bg-gray-50 dark:bg-gray-950 border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-gray-800 xl:h-full"
      >
        <!-- Read-only indicator — a small badge in the corner, not a giant
             watermark swallowing the panel (the canvas already flags it too). -->
        <div v-if="store.readOnly || store.selectedNode?.data?.blocked" class="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10 px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
            <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd" />
          </svg>
          <span class="text-[10px] font-medium uppercase tracking-wide">Read only</span>
        </div>
        <!-- Header -->
        <nav class="relative border-b border-gray-200 dark:border-gray-800 flex divide-x divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900" aria-label="Tabs">
          <a
            @click="safeSelectElement(null)"
            href="#"
            class="text-gray-700 dark:text-gray-200 group relative min-w-0 flex-1 overflow-hidden py-2 px-2 text-sm font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-10 whitespace-nowrap"
          >
            <span>
              {{ store.selectedEdge.sourceNode?.data?.label || '' }} &rarr;
              {{ store.selectedEdge.targetNode?.data?.label || '' }}
              {{ store.selectedEdge.targetHandle?.toUpperCase() }}
            </span>
            <span class="bg-indigo-500 absolute inset-x-0 bottom-0 h-0.5" aria-hidden="true" />
          </a>
        </nav>

        <!-- Edge info bar -->
        <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs px-2 py-2 flex justify-start items-center gap-2">
          <button @click="showDeleteModal = true" type="button" :disabled="store.readOnly" :title="store.readOnly ? 'You are in read only mode' : 'Delete Edge'" class="text-red-500 dark:text-red-400 border border-red-300 dark:border-red-800 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
            Delete Edge
          </button>
          <div class="px-2">
            <h3 class="font-semibold text-gray-700 dark:text-gray-300">EdgeID</h3>
            <p class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ store.selectedEdge.id }}</p>
          </div>
        </div>

        <!-- 3-column layout: Source Node | Edge Configuration | Target Node -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left column: Source data (1/4) -->
          <div class="w-1/4 flex-shrink-0 flex flex-col border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ store.selectedEdge.sourceNode?.data?.label || 'Source' }}</h3>
              <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ store.selectedEdge.sourceHandle }}</p>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
              <div v-if="edgeSourceLoading" class="text-center text-gray-400 py-4 text-xs">Loading...</div>
              <VueJsonPretty
                v-else-if="edgeSourceData && Object.keys(edgeSourceData).length > 0"
                :data="edgeSourceData"
                :deep="2"
                :theme="isDark ? 'dark' : 'light'"
                class="text-xs"
              />
              <div v-else class="text-center text-gray-400 py-4 text-xs">No data</div>
            </div>
          </div>

          <!-- Middle column: Configuration form (1/2) -->
          <div class="w-1/2 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900">
            <div class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 12l-8-8v5H4v6h8v5l8-8z" />
                  </svg>
                  Edge configuration
                </h3>
                <button
                  v-if="edgeSchemaStale && !store.readOnly"
                  @click="refreshEdgeSchema"
                  type="button"
                  class="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
                  title="Edge schema differs from component schema. Click to reset to component defaults (custom schema changes will be lost)."
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              </div>
              <p class="text-xs text-gray-400 dark:text-gray-500">Map input data to target port</p>
            </div>
            <form @submit.prevent="updatePort" class="flex-1 flex flex-col overflow-hidden" @focusin="onFormFocusIn" @focusout="onFormFocusOut">
              <!-- Hidden inputs to prevent autofill -->
              <div>
                <input type="text" name="username" value="" style="display:none;" />
                <input type="password" name="password" value="" style="display:none;" />
              </div>
              <!-- Per-edge retry policy. Default is single-shot (no
                   implicit retry). Authors opt into MaxAttempts > 1
                   for retry-safe targets; NonRetryableErrorCodes
                   short-circuit even when attempts remain. -->
              <EdgeRetryPolicyForm
                v-model="edgeRetryPolicy"
                :disabled="store.readOnly || store.selectedEdge?.data?.blocked"
              />
              <div class="flex-1 overflow-y-auto">
                <!-- JSON Editor for edge configuration -->
                <div class="min-h-30" v-if="selectedConfigurationObj.value && selectedSchemaObj">
                  <json-editor
                    :schema="selectedSchemaObj"
                    :key="store.selectedNodeId + store.selectedEdge.id + '-' + configurationResetKey"
                    @update-value="updateConfiguration($event, store.selectedNodeId, store.selectedEdge.sourceHandle)"
                    @lookup="(data, schema, cb) => lookupComponent?.lookup(data, selectedSchemaObj, schema, cb)"
                    :has-delete-button="false"
                    :allow-edit-schema="true"
                    :readonly="store.readOnly || (store.selectedNode && store.selectedNode.data.blocked) || (settingsHandleSchemaObj && findRecursive(settingsHandleSchemaObj, 'configure', true))"
                    :initial-value="selectedConfigurationObj.value || {}"
                    :allow-lookup="true"
                    :hide-root-lookup="true"
                    :disable-collapse="true"
                    :locale="locale"
                  />
                </div>
                <!-- Validation errors -->
                <div v-if="store.selectedEdgeData.errors" class="pt-2 pl-2 dark:text-gray-300">
                  <p class="text-red-300 text-xs font-medium">Server validation errors:</p>
                  <p v-for="(err, key) in store.selectedEdgeData.errors" :key="key" class="text-red-500 text-xs">
                    <span>{{ key }}</span> <span class="p-2">{{ err }}</span>
                  </p>
                </div>
              </div>
              <!-- Warning message and Save/Discard buttons -->
              <div class="text-right px-2 pt-2 pb-3 border-t border-gray-200 dark:border-gray-700">
                <p class="text-xs text-amber-600 dark:text-amber-400 pb-2 text-left">Do not store sensitive information if you plan sharing your project as a solution.</p>
                <div class="flex justify-end space-x-2">
                  <button
                    v-if="configurationDirty"
                    type="button"
                    @click="handleDiscardAndProceed"
                    class="px-4 py-2 text-xs leading-4 font-medium rounded-md text-red-600 bg-red-50 enabled:hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 enabled:dark:hover:bg-red-900/40 dark:text-red-400"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    :disabled="store.readOnly || store.selectedEdge.data?.blocked || (selectedSchemaObj && findRecursive(selectedSchemaObj, 'configure', true))"
                    :title="store.readOnly ? 'You are in read only mode' : (store.selectedEdge.data?.blocked ? 'Can not update this edge in the current flow' : 'Save')"
                    class="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- Right column: Preview result (1/4) -->
          <div class="w-1/4 flex-shrink-0 flex flex-col border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ store.selectedEdge.targetNode?.data?.label || 'Target' }}</h3>
              <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ store.selectedEdge.targetHandle }}</p>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
              <div v-if="edgePreviewLoading" class="text-center text-gray-400 py-4 text-xs">Computing...</div>
              <div v-else-if="edgePreviewError" class="text-center text-red-400 py-4 text-xs">{{ edgePreviewError }}</div>
              <VueJsonPretty
                v-else-if="edgePreviewResult && Object.keys(edgePreviewResult).length > 0"
                :data="edgePreviewResult"
                :deep="2"
                :theme="isDark ? 'dark' : 'light'"
                class="text-xs"
              />
              <div v-else class="text-center text-gray-400 py-4 text-xs">No preview</div>
            </div>
          </div>
        </div>

        <!-- Trace error -->
        <div v-if="store.selectedEdge.data?.trace?.error" class="text-center">
          <div class="p-4 text-xs bg-red-50 text-left dark:bg-red-800">
            {{ store.selectedEdge.data.trace.error }}
          </div>
        </div>
        <InlineOverlay v-if="store.loadingAlt">Saving</InlineOverlay>
      </aside>

      <!-- Side panel - Multiple nodes selected -->
      <aside
        v-else-if="flow && store.selectedNodes.length > 1"
        class="relative text-sm xl:flex xl:flex-col flex-shrink-0 xl:w-1/4 w-full bg-gray-50 dark:bg-gray-950 border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-gray-800 xl:h-full"
      >
        <!-- Toolbar -->
        <div class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ store.selectedNodes.length }} selected</span>
          <div class="flex-1" />
          <button
            @click="onTransferMultipleSelected"
            type="button"
            :disabled="store.readOnly"
            :title="store.readOnly ? 'You are in read only mode' : 'Transfer selected nodes to another flow'"
            class="flex items-center gap-1 px-2 py-1 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded disabled:opacity-50"
          >
            <Square3Stack3DIcon class="h-4 w-4" />
            <span>Transfer</span>
          </button>
          <button
            @click="showDeleteMultipleModal = true"
            type="button"
            :disabled="store.readOnly"
            :title="store.readOnly ? 'You are in read only mode' : 'Delete selected nodes'"
            class="flex items-center gap-1 px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
          >
            <TrashIcon class="h-4 w-4" />
            <span>Delete</span>
          </button>
          <button
            @click="clearSelection"
            type="button"
            title="Cancel selection"
            class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>
        <!-- Selected nodes list -->
        <div class="p-3 overflow-y-auto">
          <ul class="space-y-1">
            <li v-for="node in store.selectedNodes" :key="node.id" class="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded text-sm">
              <span class="truncate flex-1">{{ node.data?.label || node.id }}</span>
              <button
                @click="deselectNode(node.id)"
                type="button"
                title="Remove from selection"
                class="p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Side panel - Single node selected -->
      <aside
        v-else-if="flow && store.selectedNode"
        class="relative text-sm xl:flex xl:flex-col flex-shrink-0 xl:w-1/2 w-full bg-gray-50 dark:bg-gray-950 border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-gray-800 xl:h-full"
      >
        <!-- Read-only indicator — a small badge in the corner, not a giant
             watermark swallowing the panel (the canvas already flags it too). -->
        <div v-if="store.readOnly || store.selectedNode?.data?.blocked" class="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10 px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
            <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd" />
          </svg>
          <span class="text-[10px] font-medium uppercase tracking-wide">Read only</span>
        </div>
        <!-- Configuration tab active -->
        <div
          v-if="configurationTab.current && store.selectedNode"
          :class="['relative flex flex-col h-full', store.selectedNode.data?.error ? 'bg-red-50 dark:bg-red-950 dark:text-white' : '']"
        >
          <nav class="relative z-0 border-b dark:border-gray-600 flex gap-1" aria-label="Tabs">
            <a
              href="#"
              @click.prevent="setCurrentTab('status')"
              :class="[statusTab.current ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 hover:text-gray-700', 'group relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-gray-900 py-2 px-2 text-sm font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-400 focus:z-10 whitespace-nowrap']"
            >
              <span>{{ store.selectedNodeLabel }}</span>
              <span :class="[statusTab.current ? 'bg-indigo-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" aria-hidden="true" />
            </a>
            <a
              href="#"
              @click.prevent="setCurrentTab('configuration')"
              :class="[
                store.selectedNode.data?.error ? (configurationTab.current ? 'text-gray-600 dark:text-red-300 bg-red-50 dark:bg-red-950' : 'text-gray-500 hover:text-red-700 bg-red-50') : (configurationTab.current ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-400'),
                'group relative min-w-0 flex-1 overflow-hidden py-2 px-2 text-sm font-medium text-center focus:z-10 whitespace-nowrap'
              ]"
            >
              <span>Configuration</span>
              <span :class="[configurationTab.current ? 'bg-indigo-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" aria-hidden="true" />
            </a>
          </nav>
          <p class="font-light p-4 text-center" v-if="store.selectedNode.data?.error">
            Error: {{ store.selectedNode.data.status }}
          </p>
          <form @submit.prevent="updatePort" v-if="store.settingsHandle" class="flex flex-col h-full" @focusin="onFormFocusIn" @focusout="onFormFocusOut">
            <div>
              <input type="text" name="prevent_autofill" value="" style="display:none;" />
              <input type="password" name="password_fake" value="" style="display:none;" />
            </div>
            <div class="overflow-y-scroll min-h-30" v-if="settingsHandleSchemaObj">
              <json-editor
                :schema="settingsHandleSchemaObj"
                class="rounded-md shadow-sm"
                :key="store.selectedNodeId + (store.settingsHandle?.id || '') + '-' + configurationResetKey"
                @update-value="updateConfiguration($event, store.selectedNodeId, 'settings')"
                :has-delete-button="false"
                :allow-edit-schema="true"
                :allow-lookup="false"
                :plain-struct="true"
                :readonly="store.readOnly || (store.selectedNode && store.selectedNode.data.blocked) || findRecursive(settingsHandleSchemaObj, 'configure', true)"
                :initial-value="selectedConfigurationObj.value"
                :disable-collapse="true"
                :locale="locale"
              />
            </div>
            <div class="text-right px-2 pt-2 pb-4 min-h-24">
              <p class="text-xs text-amber-600 dark:text-amber-400 pb-2 absolute">Do not store sensitive information if you plan sharing your project as a solution.</p>
              <div class="flex justify-end space-x-2">
                <button
                  v-if="configurationDirty"
                  type="button"
                  @click="handleDiscardAndProceed"
                  class="px-4 py-2 border border-transparent text-xs leading-4 font-medium rounded-md text-red-600 bg-red-50 enabled:hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 enabled:dark:hover:bg-red-900/40 dark:text-red-400"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  :disabled="store.readOnly || store.selectedNode.data?.blocked || findRecursive(settingsHandleSchemaObj, 'configure', true)"
                  :title="store.readOnly ? 'You are in read only mode' : (store.selectedNode.data?.blocked ? 'Can not update shared node in the current flow' : 'Save')"
                  class="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
            <InlineOverlay v-if="store.loadingAlt">Saving</InlineOverlay>
          </form>
          <div v-else class="p-4 pt-5 text-center dark:text-gray-400">
            No configuration needed for the selected node.
          </div>
        </div>

        <!-- Status tab active -->
        <div v-if="statusTab.current" class="flex flex-col h-full">
          <nav class="relative z-0 border-b dark:border-gray-600 flex gap-1" aria-label="Tabs">
            <a
              href="#"
              @click.prevent="setCurrentTab('status')"
              :class="[statusTab.current ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 hover:text-gray-700', 'group relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-gray-900 py-2 px-2 text-sm font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-400 focus:z-10 whitespace-nowrap']"
            >
              <span>{{ statusTab.name || store.selectedNodeLabel }} <span v-if="store.selectedNode.data?.blocked">[shared, readonly]</span></span>
              <span :class="[statusTab.current ? 'bg-indigo-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" aria-hidden="true" />
            </a>
            <a
              href="#"
              @click.prevent="setCurrentTab('configuration')"
              :class="[
                store.selectedNode.data?.error ? (configurationTab.current ? 'text-gray-600 dark:text-red-300 bg-red-50' : 'text-gray-500 hover:text-red-700 bg-red-50 dark:bg-red-900 dark:text-white') : (configurationTab.current ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-400'),
                'group relative min-w-0 flex-1 overflow-hidden py-2 px-2 text-sm font-medium text-center focus:z-10 whitespace-nowrap'
              ]"
            >
              <span>Configuration</span>
              <span :class="[configurationTab.current ? 'bg-indigo-500' : 'bg-transparent', 'absolute inset-x-0 bottom-0 h-0.5']" aria-hidden="true" />
            </a>
          </nav>
          <div v-if="statusTab.current" class="flex flex-col h-full overflow-scroll">
            <div class="bg-white m-1 dark:bg-gray-900 shadow rounded-lg text-xs" v-if="store.selectedNode && store.selectedNode.data && flow">
              <div class="px-1 py-2 flex justify-between">
                <div class="w-full">
                  <p>
                    <input
                      type="text"
                      readonly
                      class="w-full m-1 p-1 border-transparent dark:bg-gray-900 focus:border-transparent focus:ring-0 dark:text-gray-300 text-gray-600"
                      :value="store.selectedNode.id"
                    />
                  </p>
                  <div class="font-light px-2 dark:text-gray-300 text-gray-600">
                    <p>{{ decodeHtmlEntities(store.selectedNode.data.component_info) }}</p>
                    <p>Module: <span class="font-semibold">{{ store.selectedNode.data.module }}</span></p>
                    <p>Component: <span class="font-semibold">{{ store.selectedNode.data.component }}</span></p>
                    <!-- Show source flow for blocked/shared nodes -->
                    <p v-if="store.selectedNode.data?.blocked && store.selectedNode.data?.flow_id" class="text-emerald-600 dark:text-emerald-400">
                      Flow: <span class="font-semibold">{{ store.selectedNode.data.flow_id }}</span>
                    </p>
                    <p :class="[selectedNodeExpiring ? 'text-red-500' : '']">
                      Last update:
                      <span class="font-semibold" v-if="store.selectedNode.data.last_status_update">
                        <TimeAgo :datetime="store.selectedNode.data.last_status_update * 1000" :auto-update="true" />
                      </span>
                      <span v-else class="font-semibold text-red-500">Never</span>
                    </p>
                  </div>
                </div>
                <!-- Node actions menu -->
                <Menu v-if="!store.readOnly" as="div" class="ml-3 relative inline-block text-left">
                  <div>
                    <MenuButton class="-my-2 p-2 rounded-full flex items-center text-gray-600 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <span class="sr-only">Open options</span>
                      <EllipsisVerticalIcon class="h-5 w-5" aria-hidden="true" />
                    </MenuButton>
                  </div>
                  <transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <MenuItems class="origin-top-right absolute z-40 right-0 mt-2 w-56 rounded-md bg-white border border-gray-200 dark:border-gray-800 ring-1 ring-gray-200 dark:ring-gray-800 focus:outline-none dark:bg-gray-900">
                      <div class="py-1">
                        <!-- Blocked node message -->
                        <div v-if="store.selectedNode.data?.blocked" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          This node is shared from another flow. Edit it in the original flow.
                        </div>
                        <MenuItem v-slot="{ active }" v-if="!store.selectedNode.data?.blocked && !store.readOnly">
                          <button
                            @click="onTransferSelected"
                            type="button"
                            :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']"
                          >
                            <Square3Stack3DIcon class="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span>Transfer node</span>
                          </button>
                        </MenuItem>
                        <MenuItem v-slot="{ active }" v-if="!store.selectedNode.data?.blocked && !store.readOnly">
                          <button
                            @click="onRenameSelected"
                            type="button"
                            :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']"
                          >
                            <PencilIcon class="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span>Rename node</span>
                          </button>
                        </MenuItem>
                        <MenuItem v-slot="{ active }" v-if="!store.selectedNode.data?.blocked && !store.readOnly">
                          <button
                            @click="onSettingSelected"
                            type="button"
                            :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']"
                          >
                            <CogIcon class="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span>Settings</span>
                          </button>
                        </MenuItem>
                        <MenuItem v-slot="{ active }" v-if="!store.selectedNode.data?.blocked && !store.readOnly">
                          <button
                            @click="onDeleteSelected"
                            type="button"
                            :class="[active ? 'bg-red-50 dark:bg-red-900/20' : '', 'w-full flex px-4 py-2 text-sm text-red-600 dark:text-red-400']"
                          >
                            <TrashIcon class="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span>Delete node</span>
                          </button>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </transition>
                </Menu>
              </div>
              <!-- Control handle form -->
              <form @submit.prevent="updatePort" v-if="store.selectedNode && store.selectedControl && store.controlHandleSchema" class="relative" @focusin="onFormFocusIn" @focusout="onFormFocusOut">
                <input type="text" name="prevent_autofill" value="" style="display:none;" />
                <input type="password" name="password_fake" value="" style="display:none;" />
                <json-editor
                  :schema="store.controlHandleSchema"
                  :key="'control-form-' + store.selectedNodeId + '-' + controlFormKey"
                  @update-value="updateStatus($event, store.selectedNodeId, '_control')"
                  :has-delete-button="false"
                  :plain-struct="true"
                  :allow-edit-schema="false"
                  :allow-lookup="false"
                  :initial-value="store.selectedControl"
                  :disable-collapse="true"
                  :locale="locale"
                />
                <div v-if="store.controlHandle && store.controlHandle.error" class="text-center">
                  <div class="p-4 text-xs bg-red-50 text-left mt-2 dark:bg-red-800">
                    {{ store.controlHandle.error }}
                  </div>
                </div>
              </form>
            </div>
            <!-- Port tabs and data preview -->
            <div class="px-1 flex-1 flex flex-col min-h-0">
              <FlowPortTabs
                :handles="store.selectedNode?.data?.handles || []"
                :selected-handle-id="store.selectedHandle?.id"
                @select="store.selectedNode.selectedHandleId = $event"
                class="flex-1 min-h-[250px]"
              >
                <div class="relative bg-white dark:bg-gray-900 dark:text-gray-300 shadow rounded-none text-[10px] h-full flex flex-col border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <!-- Watermark with node name — small + bottom-anchored so it
                       labels the panel without swallowing the JSON preview. -->
                  <div class="absolute inset-x-0 bottom-1 flex items-end justify-center pointer-events-none select-none">
                    <span class="text-[13px] font-semibold text-gray-200 dark:text-gray-700 uppercase tracking-widest text-center px-4 truncate max-w-full leading-none">
                      {{ store.selectedNode?.data?.component || '' }}
                    </span>
                  </div>
                  <!-- Copy button -->
                  <button
                    v-if="inspectReady && inspect"
                    @click="copyInspectToClipboard"
                    class="absolute top-2 right-2 z-10 p-1.5 rounded-md transition-colors
                      bg-gray-100/80 hover:bg-gray-200 text-gray-600
                      dark:bg-gray-800/80 dark:hover:bg-gray-700 dark:text-gray-400
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    :title="inspectCopied ? 'Copied!' : 'Copy to clipboard'"
                  >
                    <ClipboardDocumentCheckIcon v-if="inspectCopied" class="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <ClipboardDocumentIcon v-else class="h-4 w-4" />
                  </button>
                  <div class="p-2 flex-1 overflow-y-auto relative z-[1]">
                    <VueJsonPretty v-if="inspectReady" :data="inspect || {}" :theme="isDark ? 'dark' : 'light'" :deep="2" class="[&_.vjs-tree]:!bg-transparent" />
                  </div>
                </div>
              </FlowPortTabs>
            </div>
            <!-- Node and edge errors -->
            <div v-if="store.selectedNode?.data?.error || store.selectedNodeErrors.length > 0" class="m-1 p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
              <p class="font-semibold text-red-600 dark:text-red-400 pb-1">Errors:</p>
              <div v-if="store.selectedNode?.data?.error" class="text-red-700 dark:text-red-300 pb-1">
                <span class="font-medium">Node:</span> {{ store.selectedNode.data.status }}
              </div>
              <div v-for="err in store.selectedNodeErrors" :key="err.edgeId" class="text-red-700 dark:text-red-300 pb-1">
                <span class="font-medium">Edge {{ err.source }} → {{ err.target }}:</span> {{ err.error }}
              </div>
            </div>
            <InlineOverlay v-if="store.loadingAlt">Loading</InlineOverlay>
            <div class="min-h-16" v-if="!store.selectedNode.data?.trace">
              <p class="p-2 text-xs dark:text-gray-400">Data structure generated automatically based on the meta information of the components and runtime. Values may be explanatory.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Executions below the canvas: ONE collapsible section (clicking either
         header folds RUNS + TELEMETRY together). The top grab bar resizes the
         section height; the middle divider resizes the RUNS/TELEMETRY split.
         Both persist. RUNS (durable-only) left, TRACES (universal) right. -->
    <div v-if="flow && project" class="border-t border-gray-200 dark:border-gray-700">
      <div
        v-if="!execCollapsed"
        class="h-1 w-full cursor-row-resize bg-transparent hover:bg-indigo-500/60 transition-colors"
        title="Drag to resize"
        @mousedown.prevent="startExecResize"
      ></div>
      <!-- The RUNS pane exists only for flows that actually produce durable
           run records. For classic flows an empty "No runs yet" reads as
           "this flow never ran" while Telemetry shows its traces right next
           to it — so the pane stays mounted (v-show) to keep polling, but
           hidden until a run exists, and Telemetry takes the full width. -->
      <div ref="execRowRef" class="flex flex-col lg:flex-row" :style="{ '--exec-h': execHeight + 'px', '--runs-w': runsPct + '%' }">
        <div v-show="runsCount > 0" class="min-w-0 w-full lg:w-[var(--runs-w)] lg:flex-none" :class="execCollapsed ? 'lg:border-r border-gray-200 dark:border-gray-700' : ''">
          <FlowRuns
            :flow-name="flow.ResourceName"
            :project-name="project.ResourceName"
            :initial-run="null"
            :initial-step="null"
            :collapsed="execCollapsed"
            @toggle="toggleExec"
            @expand="expandExec"
            @select-node="store.select($event)"
            @open-run="onOpenRun"
            @open-step="onOpenStep"
            @count="runsCount = $event"
          />
        </div>
        <div
          v-if="!execCollapsed && runsCount > 0"
          class="hidden lg:block w-1 flex-none cursor-col-resize bg-gray-200 dark:bg-gray-800 hover:bg-indigo-500/60 transition-colors"
          title="Drag to resize columns"
          @mousedown.prevent="startColResize"
        ></div>
        <div class="lg:flex-1 min-w-0">
          <Telemetry
            :trace="store.trace || ''"
            :flow-name="flow.ResourceName"
            :project-name="project.ResourceName"
            :collapsed="execCollapsed"
            @toggle="toggleExec"
            @trace="loadTrace"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <FlowRevisions
      v-if="flow && store.showRevisions"
      :flow-id="flow.ID"
      @close="store.showRevisions = false"
    />

    <FlowDeleteModal
      v-if="showDeleteModal && flow"
      :flow-id="flow.ID"
      @close="showDeleteModal = false"
      @delete="deleteSelectedElement"
    />

    <!-- Delete multiple nodes confirmation modal -->
    <TransitionRoot as="template" :show="showDeleteMultipleModal">
      <Dialog as="div" class="relative z-10" @close="showDeleteMultipleModal = false">
        <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
          <div class="flex items-center justify-center min-h-full p-4 text-center">
            <DialogPanel class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                  <ExclamationTriangleIcon class="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Delete {{ store.selectedNodes.length }} nodes?
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete these nodes? This action cannot be undone.
                    </p>
                    <ul class="mt-2 text-sm text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto">
                      <li v-for="node in store.selectedNodes" :key="node.id" class="py-0.5">
                        {{ node.data?.label || node.id }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  @click="showDeleteMultipleModal = false"
                  type="button"
                  class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  @click="deleteMultipleNodes"
                  type="button"
                  class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded"
                >
                  Delete all
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <FlowTransferNode
      v-if="showTransferModal && flow && (selectedNodeClone || store.selectedNodes.length > 0)"
      :all-flows="flows"
      :current-flow="flow"
      :selected-node="selectedNodeClone"
      @close="showTransferModal = false"
      @flowCreated="loadFlowList"
    />

    <FlowRenameNode
      v-if="showRenameModal && selectedNodeClone"
      :selected-node="selectedNodeClone"
      @close="showRenameModal = false"
    />

    <FlowNodeSettings
      v-if="showSettingsModal && selectedNodeClone && flow"
      :all-flows="flows"
      :current-flow="flow"
      :selected-node="selectedNodeClone"
      :project-id="project?.ID"
      @close="showSettingsModal = false"
      @flows-updated="loadFlowList"
    />


    <FlowDataLookupModal ref="lookupComponent" />

    <!-- Reset Schema Confirmation Modal -->
    <TransitionRoot as="template" :show="showResetSchemaModal">
      <Dialog as="div" class="relative z-10" @close="!resetSchemaLoading && (showResetSchemaModal = false)">
        <div class="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-25 dark:bg-black dark:bg-opacity-75 backdrop-blur-sm">
          <div class="flex items-center justify-center min-h-full p-4 text-center">
            <DialogPanel class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900">
                  <ExclamationTriangleIcon class="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Reset Edge Schema?
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      This will reset the edge schema to component defaults. Any custom schema changes will be lost.
                    </p>
                  </div>
                  <!-- Error message -->
                  <div v-if="resetSchemaError" class="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded text-sm text-red-600 dark:text-red-400">
                    {{ resetSchemaError }}
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  @click="showResetSchemaModal = false"
                  type="button"
                  :disabled="resetSchemaLoading"
                  class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  @click="confirmResetSchema"
                  type="button"
                  :disabled="resetSchemaLoading"
                  class="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ resetSchemaLoading ? 'Resetting...' : 'Reset' }}
                </button>
              </div>
              <InlineOverlay v-if="resetSchemaLoading">Saving</InlineOverlay>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Unsaved Changes Modal -->
    <TransitionRoot as="template" :show="showUnsavedChangesModal">
      <Dialog as="div" class="relative z-50" @close="handleCancelUnsavedModal">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75" />
        </TransitionChild>

        <div class="fixed inset-0 z-10 overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon class="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Unsaved Changes
                    </DialogTitle>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        You have unsaved changes in your configuration. Would you like to save them before continuing?
                      </p>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="button"
                    class="inline-flex w-full justify-center rounded bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 sm:w-auto"
                    @click="handleSaveAndProceed"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="inline-flex w-full justify-center rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 sm:w-auto"
                    @click="handleDiscardAndProceed"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    class="inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 sm:w-auto"
                    @click="handleCancelUnsavedModal"
                  >
                    Cancel
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
import { useDark } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useVueFlow } from '@vue-flow/core'
import { notify } from 'notiwind'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems
} from '@headlessui/vue'
import {
  EllipsisVerticalIcon,
  Square3Stack3DIcon
} from '@heroicons/vue/24/solid'
import {
  CogIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/vue/24/outline'

// The backend seam + host facts, provided down the editor tree. The host
// passes a transport-bound EditorClient in via props (in place of the
// platform's useNuxtApp().$grpc); we provide it plus an empty EditorContext.
import { provideEditorClient, provideEditorContext, type EditorClient } from './store/client'
import { useFlowStore } from './store/flow'
import { defaultLocale as locale } from './json-editor/common'
import { default as JsonEditor } from './json-editor/JSONEditor.vue'

import ControlPanel from './flow/ControlPanel.vue'
import FlowEditor from './flow/FlowEditor.vue'
import EdgeRetryPolicyForm from './flow/EdgeRetryPolicyForm.vue'
import FlowAddComponent from './flow/FlowAddComponent.vue'
import FlowDeleteModal from './flow/FlowDeleteModal.vue'
import FlowTransferNode from './flow/FlowTransferNode.vue'
import FlowRenameNode from './flow/FlowRenameNode.vue'
import FlowNodeSettings from './flow/FlowNodeSettings.vue'
import FlowRevisions from './flow/FlowRevisions.vue'
import FlowDataLookupModal from './flow/FlowDataLookupModal.vue'
import FlowRuns from './flow/FlowRuns.vue'
import FlowPortTabs from './flow/PortTabs.vue'
import Telemetry from './flow/Telemetry.vue'
import Trace from './flow/Trace.vue'
import InlineOverlay from './canvas/InlineOverlay.vue'
import TimeAgo from './support/TimeAgo.vue'

// JsonEditor is used in the template via the kebab-case tag <json-editor>,
// which the Vue compiler resolves to this PascalCase setup binding.

// Public API — the host mounts <FlowWorkspace :client :project-name :flow-name />.
// These replace the page's route params + useNuxtApp().$grpc.
const props = defineProps<{
  client: EditorClient
  projectName: string
  flowName: string
}>()

// Provide the backend seam and (empty) context at the top of the tree so all
// lifted components inject them instead of reaching for Nuxt globals.
provideEditorClient(props.client)
provideEditorContext({})

const client = props.client

// Decode HTML entities like &#39; to actual characters. Ported from the page's
// textarea/innerHTML idiom, reimplemented with DOMParser so no untrusted string
// is ever assigned to innerHTML (scripts never execute in a parsed-but-detached
// document; named/numeric entities still decode).
const decodeHtmlEntities = (text: string | null | undefined): string => {
  if (!text) return ''
  if (typeof document === 'undefined') return text // SSR fallback
  const doc = new DOMParser().parseFromString(text, 'text/html')
  return doc.documentElement.textContent || ''
}

const { setViewport } = useVueFlow()
void setViewport // viewport is handled by FlowEditor.vue onPaneReady

// Flow store
const store = useFlowStore()
const {
  selectedNode,
  lastUpdate,
  settingsHandleSchema,
  selectedConfiguration,
  selectedSchema,
  selectedHandle
} = storeToRefs(store)

// Dark mode
const isDark = useDark()

// Local state
const flow = ref<any>(null)
const project = ref<any>(null)
const flows = ref<any[]>([])
const inspect = ref<any>(null)

// Connected state - combines initial load and stream health
const connected = computed(() => {
  // If still loading, consider connected
  if (store.loading) return true
  // After loading, use stream connection state
  return store.streamConnected
})
const error = computed(() => store.streamError)
const inspectReady = ref(false)
const inspectCopied = ref(false)

// Edge source data and preview state
const edgeSourceData = ref<any>({})
const edgeSourceLoading = ref(false)
const edgePreviewResult = ref<any>({})
const edgePreviewLoading = ref(false)
const edgePreviewError = ref('')

// Deep equality check that ignores property order
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false

  return keysA.every(key => key in b && deepEqual(a[key], b[key]))
}

// Check if edge schema is stale (differs from component's schema)
const edgeSchemaStale = computed(() => {
  // Only check when edge is selected and has its own schema
  if (!store.selectedEdge || !store.selectedEdgeData) return false

  const edgeSchema = store.selectedEdgeData.schema
  const handleSchema = store.selectedEdgeTargetHandle?.schema

  // If edge has no schema, it's using component schema - not stale
  if (!edgeSchema) return false

  // If no handle schema to compare, not stale
  if (!handleSchema) return false

  // Deep equality check (ignores property order)
  return !deepEqual(edgeSchema, handleSchema)
})

// Show reset schema confirmation modal
const refreshEdgeSchema = () => {
  if (!store.selectedEdge || !store.selectedEdgeData || !store.selectedEdgeTargetHandle) return
  resetSchemaError.value = ''
  showResetSchemaModal.value = true
}

// Actually reset edge schema after confirmation
const confirmResetSchema = async () => {
  if (!store.selectedEdge || !store.selectedEdgeData || !store.selectedEdgeTargetHandle) return

  const handleSchema = store.selectedEdgeTargetHandle.schema
  if (!handleSchema) return

  resetSchemaLoading.value = true
  resetSchemaError.value = ''

  try {
    // Update edge schema to match component schema
    store.selectedEdgeData.schema = deepCopy(handleSchema)

    // Update local schema object
    selectedSchemaObj.value = deepCopy(handleSchema)

    // Increment reset key to force json-editor to remount with new schema — next emit is normalization
    configurationInitializing.value = true
    configurationResetKey.value++

    // Save the flow and wait for completion
    await store.save()

    // Success - close dialog
    showResetSchemaModal.value = false
  } catch (e: any) {
    resetSchemaError.value = e.message || 'Failed to save'
  } finally {
    resetSchemaLoading.value = false
  }
}

const copyInspectToClipboard = async () => {
  if (!inspect.value) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(inspect.value, null, 2))
    inspectCopied.value = true
    setTimeout(() => {
      inspectCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Modal state
const showAddComponent = ref(false)
const showDeleteModal = ref(false)
const showDeleteMultipleModal = ref(false)
const showRenameModal = ref(false)
const showTransferModal = ref(false)
const showSettingsModal = ref(false)
const showResetSchemaModal = ref(false)
const resetSchemaLoading = ref(false)
const resetSchemaError = ref('')

// Template refs
const lookupComponent = ref<InstanceType<typeof FlowDataLookupModal> | null>(null)

const newNodePosition = ref({ x: 0, y: 0 })
const selectedNodeClone = ref<any>(null)

// Tab state
const statusTab = reactive({ id: 'status', name: '', current: true })
const configurationTab = reactive({ id: 'configuration', name: 'Configuration', current: false })
const tabs = [statusTab, configurationTab]

// Configuration objects - reactive to match original behavior with Object.assign
const settingsHandleSchemaObj = ref<any>(null)
const selectedConfigurationObj = reactive<any>({ value: null, isValid: true })
const selectedSchemaObj = ref<any>(null)

// Per-edge retry policy. v-modeled into the EdgeRetryPolicyForm
// component above the JSON editor; persisted onto edge.data.retryPolicy
// inside updatePort. null means "no policy set" — the SDK treats that
// as single-shot (MaxAttempts=1).
const edgeRetryPolicy = computed<any>({
  get() {
    return (store.selectedEdge?.data as any)?.retryPolicy ?? null
  },
  set(v: any) {
    if (!store.selectedEdge || !store.selectedEdgeData) return
    if (v === null) {
      delete (store.selectedEdgeData as any).retryPolicy
    } else {
      ;(store.selectedEdgeData as any).retryPolicy = v
    }
    // Mark dirty so the Save button enables and the unsaved-changes
    // guard fires if the user navigates away.
    configurationDirty.value = true
  },
})

// Unsaved changes tracking
const originalConfigurationValue = ref<any>(null)
const configurationDirty = ref(false)
const showUnsavedChangesModal = ref(false)
const pendingSelectionAction = ref<(() => void) | null>(null)
let initEndTimer: ReturnType<typeof setTimeout> | null = null
const previousSelectedNodeId = ref<string | null>(null)
const previousSelectedEdgeId = ref<string | null>(null)
const isRestoringSelection = ref(false)
const configurationResetKey = ref(0) // Incremented on discard to force json-editor remount
const configurationInitializing = ref(false) // True after editor remount, cleared on first emit
const formFocused = ref(false) // True while user has focus inside the settings/edge form
const pendingConfigurationUpdate = ref<any>(null) // Stores server update deferred while form is focused
const controlFormKey = ref(0) // Incremented when control data changes and form is not focused
const pendingControlUpdate = ref(false) // True if a control update was deferred due to focus

// Node expiring state
const selectedNodeExpiring = ref(false)

// Stream reference
let stream: any = null
let expiryCheckInterval: ReturnType<typeof setInterval> | null = null

// Helper to deep clone
const deepCopy = (obj: any) => JSON.parse(JSON.stringify(obj))

// Form focus tracking — prevent server updates from resetting the editor while user is editing
const onFormFocusIn = () => {
  formFocused.value = true
}
const onFormFocusOut = (e: FocusEvent) => {
  // focusout fires when focus moves to another element inside the form too (it bubbles).
  // Only treat as "left" when the new focus target is outside the form.
  const form = (e.currentTarget as HTMLElement)
  if (form && e.relatedTarget && form.contains(e.relatedTarget as Node)) {
    return
  }
  formFocused.value = false
  // Apply any deferred server update now that the user left the form
  if (pendingConfigurationUpdate.value !== null) {
    const v = pendingConfigurationUpdate.value
    pendingConfigurationUpdate.value = null
    selectedConfigurationObj.value = deepCopy(v)
    originalConfigurationValue.value = deepCopy(v)
    configurationDirty.value = false
    if (initEndTimer) clearTimeout(initEndTimer)
    configurationInitializing.value = true
    configurationResetKey.value++
  }
  // Apply any deferred control form update
  if (pendingControlUpdate.value) {
    pendingControlUpdate.value = false
    controlFormKey.value++
  }
}

// Recursive search helper
const findRecursive = (object: any, key: string, val: any): boolean => {
  if (!object || typeof object !== 'object') return false
  return Object.keys(object).some((k) => {
    if (k === key && object[k] === val) {
      return true
    }
    if (object[k] && typeof object[k] === 'object') {
      return findRecursive(object[k], key, val)
    }
    return false
  })
}

// Fix schema helper
const fixSchema = (obj: any) => {
  for (let prop in obj) {
    if (prop === 'type' && obj[prop] === '') {
      delete obj[prop]
    }
    if (typeof obj[prop] === 'object') {
      fixSchema(obj[prop])
    }
  }
}

// Tab switching
const setCurrentTab = (id: string) => {
  for (let t of tabs) {
    t.current = t.id === id
  }
}

// Load flow data and start streaming
async function loadFlow() {
  try {
    // Cancel existing stream
    if (stream) {
      stream.cancel()
    }

    store.clean()
    // Feed the store the same typed contract the tree is provided —
    // it only uses the .flow slice, but this keeps one client shape.
    store.setGrpcClient(props.client)

    // Load initial flow data
    const result = await store.load(props.projectName, props.flowName)

    flow.value = result.flow
    project.value = result.project

    // Viewport is handled by FlowEditor.vue onPaneReady to avoid context/timing issues

    // Start streaming updates
    stream = await store.getStream(props.flowName, props.projectName)

  } catch (e: any) {
    store.streamConnected = false
    store.streamError = e.message || 'Failed to load flow'
    console.error('Flow load error:', e)
  }
}

// Load flow list for transfer modal
async function loadFlowList() {
  try {
    const response = await client.flow.getFlowList({
      ProjectName: props.projectName,
    })
    flows.value = response.Flows || []
  } catch (e) {
    console.error('Failed to load flow list:', e)
  }
}

// Drive edges + node inspection from the selected run's real data. (URL deep-
// linking is a host concern — the library build has no router.)
function onOpenRun(runId: string | null) {
  store.applyRun(runId)
}
function onOpenStep(_stepKey: string | null) {
  // no-op in the library build — step deep-linking is a host concern
}

// Load trace — applies the selected trace to the store. (URL deep-linking is a
// host concern; the library build has no router.)
function loadTrace(t: string | null) {
  store.applyTrace(t)
}

// Update configuration
const updateConfiguration = (v: any, node: string, port: string) => {
  if (v.isAction) {
    store.runAction(node, port, v.value).catch((e: any) => {
      notify({
        group: 'error',
        title: 'Error',
        text: e.message || 'unknown server error'
      }, 99999)
    })
    return
  }
  // Use Object.assign to merge properties like original (reactive object)
  Object.assign(selectedConfigurationObj, v)
  // During editor mount cycle, child editors emit as they initialize —
  // keep updating baseline on every emit until the cycle settles.
  // ObjectEditor emits in beforeMount, then each child (StringEditor,
  // ArrayEditor, nested ObjectEditors) also emits during their beforeMount,
  // cascading through onChange → emitValue. Only after ALL children finish
  // should we start tracking dirty state.
  if (configurationInitializing.value) {
    originalConfigurationValue.value = deepCopy(selectedConfigurationObj.value)
    // Reset the end-of-init timer on each emit — when emits stop for 100ms,
    // initialization is done and user edits can be tracked.
    if (initEndTimer) clearTimeout(initEndTimer)
    initEndTimer = setTimeout(() => {
      configurationInitializing.value = false
    }, 100)
    return
  }
  // Track dirty state by comparing with original
  configurationDirty.value = JSON.stringify(selectedConfigurationObj.value) !== JSON.stringify(originalConfigurationValue.value)
}

// Update status (control actions)
const updateStatus = (v: any, node: string, port: string) => {
  if (v.isAction) {
    store.runAction(node, port, v.value).catch((e: any) => {
      notify({
        group: 'error',
        title: 'Error',
        text: e.message || 'unknown server error'
      }, 99999)
    })
  }
}

// --- Executions section: one collapse for RUNS + TELEMETRY, resizable
// height (top grab bar) and column split (middle divider). Persisted. ---
const execCollapsed = ref(false)
const execHeight = ref(320)
const runsPct = ref(40)
// How many durable runs this flow has. 0 (classic flows) hides the RUNS
// pane entirely — Telemetry is the universal execution view. Starts at 0
// so the pane never flashes an empty state before the first load.
const runsCount = ref(0)
const execRowRef = ref<HTMLElement | null>(null)

onMounted(() => {
  execCollapsed.value = localStorage.getItem('flow.exec.collapsed') === '1'
  const h = parseInt(localStorage.getItem('flow.exec.h') || '', 10)
  if (!isNaN(h)) execHeight.value = Math.min(Math.max(h, 140), Math.round(window.innerHeight * 0.8))
  const pct = parseInt(localStorage.getItem('flow.exec.runsPct') || '', 10)
  if (!isNaN(pct)) runsPct.value = Math.min(Math.max(pct, 15), 75)
})

const toggleExec = () => {
  execCollapsed.value = !execCollapsed.value
  localStorage.setItem('flow.exec.collapsed', execCollapsed.value ? '1' : '0')
}
const expandExec = () => {
  execCollapsed.value = false
  localStorage.setItem('flow.exec.collapsed', '0')
}
const startExecResize = (e: MouseEvent) => {
  const startY = e.clientY
  const startH = execHeight.value
  const move = (ev: MouseEvent) => {
    execHeight.value = Math.min(Math.max(startH + (startY - ev.clientY), 140), Math.round(window.innerHeight * 0.8))
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    localStorage.setItem('flow.exec.h', String(execHeight.value))
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
const startColResize = (e: MouseEvent) => {
  const rect = execRowRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const move = (ev: MouseEvent) => {
    runsPct.value = Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 15), 75)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    localStorage.setItem('flow.exec.runsPct', String(Math.round(runsPct.value)))
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

const updatePort = () => {
  if (!selectedConfigurationObj.isValid) {
    return
  }
  if (store.selectedEdge && store.selectedEdgeData) {
    let schema = deepCopy(selectedSchemaObj.value)
    fixSchema(schema)
    store.selectedEdgeData.configuration = selectedConfigurationObj.value
    store.selectedEdgeData.schema = schema
  } else if (store.settingsHandle) {
    let schema = deepCopy(settingsHandleSchemaObj.value)
    fixSchema(schema)
    store.settingsHandle.configuration = selectedConfigurationObj.value
    store.settingsHandle.schema = schema
  }
  store.loadingAlt = true
  store.up()
  // Reset dirty state after saving
  originalConfigurationValue.value = deepCopy(selectedConfigurationObj.value)
  configurationDirty.value = false
  pendingConfigurationUpdate.value = null
}

// Event handlers
function handleAddNode(pos: { x: number; y: number }) {
  newNodePosition.value = pos
  showAddComponent.value = true
}

function handleConfigureEdge(id: string) {
  store.selectElement(id)
}

async function deleteSelectedElement() {
  await store.deleteSelected()
  showDeleteModal.value = false
}

async function deleteMultipleNodes() {
  await store.deleteSelected()
  showDeleteMultipleModal.value = false
}

function clearSelection() {
  store.selectElement(null)
}

function deselectNode(nodeId: string) {
  const node = store.getElement(nodeId)
  if (node) {
    (node as any).selected = false
  }
}

const onDeleteSelected = () => {
  showDeleteModal.value = true
}

// Handle delete node from keyboard (Delete key)
const handleDeleteNode = (node: any) => {
  if (!node) return
  store.select(node.id)
  showDeleteModal.value = true
}

// Handle delete edge from keyboard (Delete key)
const handleDeleteEdge = (edge: any) => {
  if (!edge) return
  store.select(edge.id)
  showDeleteModal.value = true
}

const onRenameSelected = () => {
  selectedNodeClone.value = deepCopy(store.selectedNode)
  showRenameModal.value = true
}

const onTransferSelected = () => {
  loadFlowList()
  selectedNodeClone.value = deepCopy(store.selectedNode)
  showTransferModal.value = true
}

const onTransferMultipleSelected = () => {
  // Check if any selected nodes are blocked (shared from other flows)
  const hasBlockedNodes = store.selectedNodes.some(n => n.data?.blocked)
  if (hasBlockedNodes) {
    notify({
      group: "error",
      title: "Cannot transfer",
      text: "Some selected nodes are shared from other flows and cannot be transferred"
    }, 5000)
    return
  }
  loadFlowList()
  showTransferModal.value = true
}

const onSettingSelected = () => {
  loadFlowList()
  selectedNodeClone.value = deepCopy(store.selectedNode)
  showSettingsModal.value = true
}

// Unsaved changes handlers
const checkUnsavedChanges = (action: () => void): boolean => {
  if (configurationDirty.value && !store.readOnly) {
    pendingSelectionAction.value = action
    showUnsavedChangesModal.value = true
    return true // Has unsaved changes, action blocked
  }
  return false // No unsaved changes, proceed
}

const handleSaveAndProceed = () => {
  updatePort()
  showUnsavedChangesModal.value = false
  if (pendingSelectionAction.value) {
    pendingSelectionAction.value()
    pendingSelectionAction.value = null
  }
}

const handleDiscardAndProceed = () => {
  // Revert form values to original
  if (originalConfigurationValue.value !== null) {
    selectedConfigurationObj.value = deepCopy(originalConfigurationValue.value)
  }
  // Increment reset key to force json-editor to remount — next emit is normalization
  configurationInitializing.value = true
  configurationResetKey.value++
  configurationDirty.value = false
  pendingConfigurationUpdate.value = null
  formFocused.value = false
  showUnsavedChangesModal.value = false
  if (pendingSelectionAction.value) {
    pendingSelectionAction.value()
    pendingSelectionAction.value = null
  }
}

const handleCancelUnsavedModal = () => {
  showUnsavedChangesModal.value = false
  pendingSelectionAction.value = null
}

// Wrapper to check unsaved changes before deselecting
const safeSelectElement = (id: string | null) => {
  if (!checkUnsavedChanges(() => store.selectElement(id))) {
    store.selectElement(id)
  }
}

// Watch selected node for tab name and handle unsaved changes
watch(selectedNode, (newNode, oldNode) => {
  // Skip if we're restoring selection after user cancelled
  if (isRestoringSelection.value) {
    isRestoringSelection.value = false
    return
  }

  const newId = newNode?.id || null
  const oldId = oldNode?.id || null

  // If selection changed and we have unsaved changes
  if (newId !== oldId && configurationDirty.value && !store.readOnly && oldId !== null) {
    // Store the new selection target and revert to old
    const targetId = newId
    isRestoringSelection.value = true
    store.select(oldId)

    // Show modal and handle user choice
    pendingSelectionAction.value = () => {
      isRestoringSelection.value = true
      if (targetId) {
        store.select(targetId)
      } else {
        store.selectElement(null)
      }
    }
    showUnsavedChangesModal.value = true
    return
  }

  // Update tracking for next change
  previousSelectedNodeId.value = newId

  if (newNode === undefined) return
  statusTab.name = newNode.data?.label || ''
  setCurrentTab('status')
})

// Watch selected edge for unsaved changes
watch(() => store.selectedEdge, (newEdge, oldEdge) => {
  // Skip if we're restoring selection after user cancelled
  if (isRestoringSelection.value) {
    isRestoringSelection.value = false
    return
  }

  const newId = newEdge?.id || null
  const oldId = oldEdge?.id || null

  // If selection changed and we have unsaved changes
  if (newId !== oldId && configurationDirty.value && !store.readOnly && oldId !== null) {
    // Store the new selection target and revert to old
    const targetId = newId
    isRestoringSelection.value = true
    store.select(oldId)

    // Show modal and handle user choice
    pendingSelectionAction.value = () => {
      isRestoringSelection.value = true
      if (targetId) {
        store.select(targetId)
      } else {
        store.selectElement(null)
      }
    }
    showUnsavedChangesModal.value = true
    return
  }

  // Update tracking for next change
  previousSelectedEdgeId.value = newId

  // Load edge source data when edge is selected
  if (newEdge) {
    loadEdgeSourceData(newEdge)
  } else {
    edgeSourceData.value = {}
    edgePreviewResult.value = {}
    edgePreviewError.value = ''
  }
})

// Load edge source data for preview
async function loadEdgeSourceData(edge: any) {
  if (!edge) return

  edgeSourceLoading.value = true
  edgeSourceData.value = {}
  edgePreviewResult.value = {}
  edgePreviewError.value = ''

  try {
    // Get source node's port data
    const data = await store.inspectNodePort(edge.sourceHandle, edge.source)
    edgeSourceData.value = JSON.parse(data) || {}
  } catch (e: any) {
    console.error('Failed to load edge source data:', e)
    edgeSourceData.value = {}
  } finally {
    edgeSourceLoading.value = false
  }

  // Preview will be triggered by watchers when both source data and config are ready
}

// Compute edge preview result
async function computeEdgePreview() {
  const edge = store.selectedEdge
  if (!edge || !edgeSourceData.value || Object.keys(edgeSourceData.value).length === 0) {
    edgePreviewResult.value = {}
    return
  }

  edgePreviewLoading.value = true
  edgePreviewError.value = ''

  try {
    // Use selectedConfigurationObj which has the actual form data
    const config = selectedConfigurationObj.value
    if (!config || Object.keys(config).length === 0) {
      edgePreviewResult.value = {}
      edgePreviewLoading.value = false
      return
    }

    // Call gRPC to evaluate expressions in configuration
    const configStr = typeof config === 'string' ? config : JSON.stringify(config)
    const sourceDataStr = JSON.stringify(edgeSourceData.value)

    // NOTE: previewEdgeMapping is not declared on the FlowClient interface
    // (see store/client.ts). Cast so the host-provided client can supply it.
    const response = await (client.flow as any).previewEdgeMapping({
      Configuration: configStr,
      SourceData: sourceDataStr
    })

    if (response.Result) {
      edgePreviewResult.value = JSON.parse(response.Result)
    } else {
      edgePreviewResult.value = {}
    }

    if (response.Errors && response.Errors.length > 0) {
      edgePreviewError.value = response.Errors.join(', ')
    }
  } catch (e: any) {
    edgePreviewError.value = e.message || 'Preview failed'
    edgePreviewResult.value = {}
  } finally {
    edgePreviewLoading.value = false
  }
}

// Debounced preview computation
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedComputePreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
  }
  previewDebounceTimer = setTimeout(() => {
    computeEdgePreview()
  }, 300)
}

// Watch edge configuration changes to update preview
watch(() => selectedConfigurationObj.value, (newConfig) => {
  if (store.selectedEdge && newConfig && edgeSourceData.value && Object.keys(edgeSourceData.value).length > 0) {
    debouncedComputePreview()
  }
}, { deep: true })

// Also watch source data - trigger preview when it loads and config is ready
watch(edgeSourceData, (newData) => {
  if (store.selectedEdge && newData && Object.keys(newData).length > 0 && selectedConfigurationObj.value) {
    debouncedComputePreview()
  }
}, { deep: true })

// Watch last update for notifications
watch(lastUpdate, (v) => {
  if (v && v.graph && v.graph.type === 'error') {
    notify({
      group: 'error',
      title: 'Error',
      text: v.id
    }, 99999)
  }
})

// Watch selected handle for inspect
watch(selectedHandle, async (v) => {
  if (v === undefined) return
  inspectReady.value = false
  try {
    const data = await store.inspectNodePort(store.selectedHandle.id, store.selectedNodeId)
    if (!store.selectedHandle) return
    inspect.value = JSON.parse(data)
  } catch (e) {
    inspect.value = e
  } finally {
    inspectReady.value = true
  }
})

// Watch control handle for real-time updates (status, start/stop). Watches the
// SCHEMA too, not just the configuration: a Send↔Reset style flip is a schema
// change (different button field) that often leaves the configuration value
// unchanged — without watching the schema the button label goes stale until the
// node is re-selected.
watch(() => [store.selectedControl, store.controlHandleSchema], () => {
  if (formFocused.value) {
    pendingControlUpdate.value = true
    return
  }
  controlFormKey.value++
}, { deep: true })

// Watch schema and configuration changes
watch(settingsHandleSchema, (v) => {
  if (v === undefined) return
  settingsHandleSchemaObj.value = v
})

watch(selectedConfiguration, (v) => {
  if (v === undefined) return
  // Don't overwrite form while user is editing
  if (configurationDirty.value) return
  // Skip if configuration content hasn't actually changed (just a new reference from stream)
  if (selectedConfigurationObj.value !== null && JSON.stringify(v) === JSON.stringify(selectedConfigurationObj.value)) return
  // Defer update while user has focus inside the form to avoid losing input focus
  if (formFocused.value) {
    pendingConfigurationUpdate.value = v
    return
  }
  // Use deep copy to prevent json-editor from mutating store data
  selectedConfigurationObj.value = deepCopy(v)
  // Save original value for dirty tracking (will be refined by updateConfiguration
  // as editor children emit during mount)
  originalConfigurationValue.value = deepCopy(v)
  configurationDirty.value = false
  // Cancel any pending init timer from a previous mount cycle
  if (initEndTimer) clearTimeout(initEndTimer)
  // Force json-editor remount to ensure fresh state — editor emits will
  // keep updating the baseline until the mount cycle settles (see updateConfiguration)
  configurationInitializing.value = true
  configurationResetKey.value++
})

watch(selectedSchema, (v) => {
  if (v === undefined) return
  // Schema change can cause the editor to re-render and emit normalized values.
  // Treat this as a re-initialization to avoid false dirty state.
  if (!configurationDirty.value) {
    if (initEndTimer) clearTimeout(initEndTimer)
    configurationInitializing.value = true
  }
  selectedSchemaObj.value = v
})

// Lifecycle
onMounted(() => {
  loadFlow().catch((e) => {
    store.streamError = e.message || 'Failed to load flow'
    notify({
      group: 'error',
      title: 'Error',
      text: e.message || 'unknown server error'
    }, 99999)
  })

  // Check for expiring node status
  expiryCheckInterval = setInterval(() => {
    if (!store.selectedNode || !store.selectedNode.data) {
      return
    }
    const n = new Date(store.selectedNode.data.last_status_update * 1000).getTime()
    selectedNodeExpiring.value = (Date.now().valueOf() - n) > 10 * 60 * 1000
  }, 2000)
})

onUnmounted(() => {
  if (stream) {
    stream.cancel()
  }
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval)
  }
  if (initEndTimer) {
    clearTimeout(initEndTimer)
  }
  store.trace = null
  store.clean()
})
</script>

<style scoped>
@media (min-width: 1280px) {
  .xl\:border-l {
    border-left-width: 1px;
  }

  .xl\:border-t-0 {
    border-top-width: 0 !important;
  }
}

/* VueJsonPretty font size override */
:deep(.vjs-tree) {
  font-size: 11px !important;
  line-height: 1.5 !important;
}
</style>
