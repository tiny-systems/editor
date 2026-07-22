<template>
  <div class="flex-1 z-0 flex overflow-hidden flex-col xl:flex-row">
    <!-- Single project per session — no project list. The whole viewport is
         this project. -->
    <aside
      class="text-sm relative xl:flex xl:flex-col flex-shrink-0 dark:text-gray-300 w-full bg-white dark:bg-gray-950 overflow-y-auto xl:h-full">
      <div class="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div class="flex flex-wrap items-center justify-between sm:flex-nowrap px-4 sm:px-6 lg:px-8 py-5">
          <div class="flex items-center gap-3">
            <button type="button" @click="_navigateTo(`/${workspaceSlug}/projects`)" title="Back to agents list"
                    class="xl:hidden inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm">
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span class="sr-only">Back to list of projects</span>
            </button>
            <div>
              <h3 class="text-2xl font-thin text-gray-900 dark:text-gray-100" :class="{ 'text-red-500 dark:text-red-400': error }">
                {{ error ? ('Failed to load project: ' + error) : (!project ? 'Loading…' : project.Name) }}
              </h3>
              <div class="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1" v-if="!loading && project">
                <span v-if="project.ID">ID: {{ project.ID }}</span>
                <span v-if="server" class="ml-2">
                  ·
                  <a :href="`/${workspaceSlug}/server/${server.ID || server.id}`" class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    {{ server.Info || server.info }}
                  </a>
                </span>
              </div>
              <div v-else class="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">...</div>
            </div>
          </div>
          <div class="flex items-center">
            <button type="button" @click="reloadProject" title="Refresh project information"
                    class="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 rounded-md p-2 mr-2">
              <ArrowPathIcon class="w-5 h-5 inline-block"></ArrowPathIcon>
              <span class="sr-only">Refresh</span>
            </button>
            <Menu as="div" class="relative inline-block text-left" v-if="project && accessMap && checkAccess(accessMap, 'write', true)">
              <MenuButton class="p-2 rounded-md flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none">
                <span class="sr-only">Open project menu</span>
                <EllipsisVerticalIcon class="h-5 w-5" aria-hidden="true"/>
              </MenuButton>
              <transition enter-active-class="transition ease-out duration-100"
                          enter-from-class="transform opacity-0 scale-95"
                          enter-to-class="transform opacity-100 scale-100"
                          leave-active-class="transition ease-in duration-75"
                          leave-from-class="transform opacity-100 scale-100"
                          leave-to-class="transform opacity-0 scale-95">
                <MenuItems class="origin-top-right absolute z-20 right-0 mt-2 w-48 rounded-md ring-1 ring-gray-200 dark:ring-gray-800 focus:outline-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div class="py-1">
                    <MenuItem v-slot="{ active }">
                      <a :href="`/${workspaceSlug}/project-${projectName}/configure`"
                                :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'flex px-4 py-2 text-sm']">
                        <PencilIcon class="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true"/>
                        Configure
                      </a>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button @click="showExportModal = true"
                              :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                        <ArrowDownTrayIcon class="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true"/>
                        Export project
                      </button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button @click="showImportModal = true"
                              :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                        <ArrowUpTrayIcon class="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true"/>
                        Import project
                      </button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button @click="showDeleteProjectModal = true"
                              :class="[active ? 'bg-red-50 dark:bg-red-900/20' : '', 'w-full flex px-4 py-2 text-sm text-red-600 dark:text-red-400']">
                        <TrashIcon class="mr-2 h-4 w-4" aria-hidden="true"/>
                        Delete project
                      </button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-950 border-y border-gray-200 dark:border-gray-800">
          <dl class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-800">
            <div
              @click="tab = 'theater'"
              :class="[
                'flex flex-col gap-1 cursor-pointer px-5 py-5 transition-colors relative',
                tab === 'theater' ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
              ]"
            >
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Activity</dt>
              <dd :class="['text-3xl font-thin tracking-tight', tab === 'theater' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100']">Live</dd>
              <span v-if="tab === 'theater'" class="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" aria-hidden="true" />
            </div>
            <div
              @click="tab = 'widgets'"
              :class="[
                'flex flex-col gap-1 cursor-pointer px-5 py-5 transition-colors relative',
                tab === 'widgets' ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
              ]"
            >
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Widgets</dt>
              <dd :class="['text-3xl font-thin tracking-tight', tab === 'widgets' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100']">{{ widgets.length }}</dd>
              <span v-if="tab === 'widgets'" class="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" aria-hidden="true" />
            </div>
            <div
              @click="tab = 'flows'"
              :class="[
                'flex flex-col gap-1 cursor-pointer px-5 py-5 transition-colors relative',
                tab === 'flows' ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
              ]"
            >
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Flows / nodes</dt>
              <dd :class="['text-3xl font-thin tracking-tight', tab === 'flows' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100']">
                {{ projectStat ? (projectStat.FlowsAmount || projectStat.flowsamount || 0) : 0 }}
                <span class="text-gray-300 dark:text-gray-700 font-normal mx-0.5">/</span>
                {{ projectStat ? (projectStat.NodesAmount || projectStat.nodesamount || 0) : 0 }}
              </dd>
              <span v-if="tab === 'flows'" class="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" aria-hidden="true" />
            </div>
            <div class="flex flex-col gap-1 px-5 py-5">
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                Traces
                <span v-if="connected" class="relative flex h-2 w-2" title="Live connected">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span v-else class="relative flex h-2 w-2" title="Disconnected">
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </dt>
              <dd class="text-3xl font-thin tracking-tight text-gray-900 dark:text-gray-100" title="Traces per second">{{ traceRate }}</dd>
            </div>
            <div class="flex flex-col gap-1 px-5 py-5">
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Errors</dt>
              <dd
                :class="[
                  'text-3xl font-thin tracking-tight',
                  Number(errorRate) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                ]"
                title="Spans with error attr per second"
              >{{ errorRate }}</dd>
            </div>
            <div class="flex flex-col gap-1 px-5 py-5">
              <dt class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Resources</dt>
              <dd class="text-3xl font-thin tracking-tight text-gray-900 dark:text-gray-100 tabular-nums">2.5<span class="text-base font-normal text-gray-500 dark:text-gray-400"> CPU</span> / 2400<span class="text-base font-normal text-gray-500 dark:text-gray-400">Mi</span></dd>
            </div>
          </dl>
        </div>

        <div class="w-full justify-end flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3" v-if="tab === 'flows'">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ flowLimitLabel }}
          </span>
          <button type="button"
                  :disabled="isFlowLimitReached"
                  :class="[
                    'inline-flex items-center rounded text-sm font-medium px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                    isFlowLimitReached
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  ]"
                  @click="openCreateFlow">Create flow
          </button>
        </div>

      </div>

      <div class="relative flex-1 flex flex-col h-full">
        <!-- Activity / magic theater tab. Default landing — agent
             work shows here before flows/widgets details. -->
        <div :class="['min-h-64', tab === 'theater' ? '' : 'hidden']">
          <div class="px-4 sm:px-6 lg:px-8 py-4">
            <MagicTheater :project="projectName" />
          </div>
        </div>

        <!-- Widgets tab -->
        <div :class="['min-h-64', tab === 'widgets' ? '' : 'hidden']">
          <div class="pt-3 px-4 sm:px-6 lg:px-8 flex justify-between gap-2 border-b border-gray-200 dark:border-gray-800">
            <div class="w-full">
              <div>
                <nav class="-mb-px flex gap-2" v-if="dashboardPages.length > 0">
                  <button v-for="page in dashboardPages" @click="isLayoutEditing ? void(0) : changePage(page.Name || page.name)"
                          :class="[
                            dashboardPage === (page.Name || page.name)
                              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700',
                            'whitespace-nowrap py-2 px-4 capitalize font-medium text-sm border-b-2',
                            isLayoutEditing ? '' : 'cursor-pointer'
                          ]"
                          :key="page.Name || page.name">{{ page.Title || page.title || page.Name || page.name }}
                  </button>
                </nav>
              </div>
            </div>
            <div class="flex gap-x-2 justify-end items-center pb-1" v-if="accessMap && checkAccess(accessMap, 'write', true)">
              <div class="flex gap-2" v-if="isLayoutEditing">
                <button @click="reloadProject"
                        class="text-sm px-3 py-1.5 rounded border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  Cancel
                </button>
                <button @click="toggleLayoutEdit"
                        class="text-sm px-3 py-1.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white" title="Save edit">
                  Save changes
                </button>
              </div>
              <Menu as="div" class="relative inline-block text-left" v-if="!isLayoutEditing && !error">
                <MenuButton
                  class="p-1.5 rounded-md flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none">
                  <span class="sr-only">Open options</span>
                  <EllipsisVerticalIcon class="h-5 w-5" aria-hidden="true"/>
                </MenuButton>
                <transition enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95">
                  <MenuItems
                    class="origin-top-right absolute z-20 right-0 mt-2 w-56 rounded-md ring-1 ring-gray-200 dark:ring-gray-800 focus:outline-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <div class="py-1">
                      <MenuItem v-slot="{ active }">
                        <button @click="toggleLayoutEdit"
                                :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                          <PencilIcon class="mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                          <span>Edit widgets on this page</span>
                        </button>
                      </MenuItem>
                      <MenuItem v-slot="{ active }" v-if="dashboardPage">
                        <button @click="showDeletePageModal = true"
                                :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                          <TrashIcon class="mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                          <span>Delete tab</span>
                        </button>
                      </MenuItem>
                      <MenuItem v-slot="{ active }">
                        <button @click="addPageModal = true"
                                :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                          <PlusIcon class="mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                          <span>Add tab</span>
                        </button>
                      </MenuItem>
                    </div>
                  </MenuItems>
                </transition>
              </Menu>
            </div>
          </div>
          <div class="relative">
            <div class="grid-stack">
              <Widget v-for="widget in widgets" :key="widget.id" :data="widget" :pages="dashboardPages"
                      :is-editing="isLayoutEditing"
                      @edit-schema="editWidget" @reset-schema="e => showResetSchema = e">
                <JsonEditor
                  :schema="getWidgetSchema(widget)"
                  :key="widget.id + '-' + (widget._updateTime || 0)"
                  @update-value="sendSignal($event, widget.node, widget.port)"
                  :has-delete-button="false"
                  :plain-struct="true"
                  class="w-full"
                  no-border
                  :allow-edit-schema="false"
                  :allow-lookup="false"
                  :initial-value="widget.data"
                  :disable-collapse="true"
                  :locale="locale"
                  :readonly="false"
                />
              </Widget>
              <div v-if="!loading && !error && widgets.length === 0"
                   class="p-7 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No widgets on this page.
                <span class="inline-block cursor-pointer ml-1"
                      title="To add more widgets, please enable dashboard settings in flow editor for the nodes.">
                  <InformationCircleIcon class="h-5 w-5 inline" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Flows tab -->
        <div v-if="tab === 'flows'">
          <div>
            <div v-if="!loading && !error && flows.length === 0"
                 class="p-7 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
              Flow list is empty.
            </div>
            <div class="px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8"
                 v-if="project">
              <div v-for="flow in flows" :key="flow.ID" class="group">
                <div
                  class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 lg:aspect-none group-hover:border-indigo-300 dark:group-hover:border-indigo-700 lg:h-60 cursor-pointer transition-colors"
                  @click="goToFlow(flow)"
                >
                  <FlowPreview :graph="flow.graph" :id="flow.ID"></FlowPreview>
                </div>
                <div class="mt-4 flex justify-between items-start">
                  <div>
                    <h3
                      class="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                      @click="goToFlow(flow)"
                    >
                      {{ flow.Name }}
                    </h3>
                    <p class="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">Rev: {{ flow.Revision ?? 0 }} {{ flow.RevisionComment }}</p>
                  </div>
                  <Menu as="div" class="relative inline-block text-left z-20">
                    <div>
                      <MenuButton
                        class="p-1.5 rounded-md flex items-center border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none">
                        <span class="sr-only">Open options</span>
                        <EllipsisVerticalIcon class="h-4 w-4" aria-hidden="true"/>
                      </MenuButton>
                    </div>
                    <transition enter-active-class="transition ease-out duration-100"
                                enter-from-class="transform opacity-0 scale-95"
                                enter-to-class="transform opacity-100 scale-100"
                                leave-active-class="transition ease-in duration-75"
                                leave-from-class="transform opacity-100 scale-100"
                                leave-to-class="transform opacity-0 scale-95">
                      <MenuItems
                        class="origin-top-right absolute z-20 right-0 mt-2 w-56 rounded-md ring-1 ring-gray-200 dark:ring-gray-800 focus:outline-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        <div class="py-1">
                          <MenuItem v-slot="{ active }">
                            <button type="button" @click.stop="renameFlowTarget = flow"
                                    :class="[active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300', 'w-full flex px-4 py-2 text-sm']">
                              <PencilIcon class="mr-1.5 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                              <span>Rename flow</span>
                            </button>
                          </MenuItem>
                          <MenuItem v-slot="{ active }">
                            <button type="button" @click.stop="deleteFlowTarget = flow"
                                    :class="[active ? 'bg-red-50 dark:bg-red-900/20' : '', 'w-full flex px-4 py-2 text-sm text-red-600 dark:text-red-400']">
                              <TrashIcon class="mr-1.5 h-4 w-4" aria-hidden="true" />
                              <span>Delete flow</span>
                            </button>
                          </MenuItem>
                        </div>
                      </MenuItems>
                    </transition>
                  </Menu>
                </div>
              </div>
            </div>
          </div>
        </div>

        <InlineOverlay v-if="loading">{{ loadingStatus || 'Loading' }}</InlineOverlay>

        <InlineOverlay v-if="!loading && !connected" hide-loading>
          <div class="flex flex-col items-center gap-4 p-6">
            <div class="flex items-center gap-2">
              <span class="relative flex h-3 w-3">
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span class="text-gray-600 dark:text-gray-400 font-medium">Connection lost</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
              {{ error || 'The connection to the project was interrupted.' }}
            </p>
            <button
              class="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded text-sm font-medium"
              @click="reloadProject"
            >
              Reconnect
            </button>
          </div>
        </InlineOverlay>
      </div>
    </aside>
  </div>

  <!-- Create Flow Modal -->
  <TransitionRoot as="template" :show="openNewFlowModal">
    <Dialog as="div" class="relative z-10" @close="openNewFlowModal = false">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden transform transition-all sm:my-8 sm:max-w-lg w-full sm:p-6">
              <div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Create a new flow
                  </DialogTitle>
                </div>
              </div>
              <div v-if="project">
                <CreateFlow @success="createFlowSuccess" :projectID="project.ID"></CreateFlow>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Rename Flow Modal -->
  <TransitionRoot as="template" :show="renameFlowTarget !== null">
    <Dialog as="div" class="relative z-10" @close="renameFlowTarget = null">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden transform transition-all sm:my-8 sm:max-w-lg w-full sm:p-6">
            <div>
              <div class="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Rename flow
                </DialogTitle>
              </div>
            </div>
            <div v-if="renameFlowTarget && project" class="pb-8">
              <RenameFlow @success="renameSuccess" :flow-name="renameFlowTarget.ResourceName"
                          :project-name="project.ResourceName"></RenameFlow>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Delete Flow Modal -->
  <TransitionRoot as="template" :show="deleteFlowTarget !== null">
    <Dialog as="div" class="relative z-10" @close="deleteFlowTarget = null">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrashIcon class="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Delete Flow
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to delete
                      <strong>{{ deleteFlowTarget?.Name }}</strong>?</p>
                    <p class="text-xs text-red-500 mt-2">This will permanently remove the flow and all its nodes from the cluster. This action cannot be undone.</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="deleteFlowTarget = null" type="button"
                        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2">
                  Cancel
                </button>
                <button @click="doDeleteFlow()" type="button" :disabled="deletingFlow"
                        class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded inline-flex justify-center items-center">
                  <span>Delete</span>
                  <SmallLoadingCircle v-if="deletingFlow" class="ml-2"></SmallLoadingCircle>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Delete Page Modal -->
  <TransitionRoot as="template" :show="showDeletePageModal">
    <Dialog as="div" class="relative z-10" @close="showDeletePageModal = false">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <CheckIcon class="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Confirmation.
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to delete
                      <strong>{{ dashboardPage }}</strong> tab?</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="showDeletePageModal = false" type="button"
                        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2">
                  No, cancel
                </button>
                <button @click="deletePage()" type="button"
                        class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded">
                  Yes, I'm sure
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Add Page Modal -->
  <TransitionRoot as="template" :show="addPageModal">
    <Dialog as="div" class="relative z-10" @close="addPageModal = false">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <DialogPanel
            class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-right overflow-hidden transform transition-all sm:my-8 sm:max-w-lg w-full sm:p-6">
            <div>
              <div class="mt-3 text-center">
                <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  New tab
                </DialogTitle>
              </div>
            </div>
            <div class="mt-2" v-if="project">
              <CreateNewDashboardPage :project-name="project.ResourceName || project.resourcename"
                                      @success="addPageModal=false;reloadProject()"></CreateNewDashboardPage>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Edit Widget Schema Modal -->
  <TransitionRoot as="template" :show="editWidgetSchema != null">
    <Dialog as="div" class="relative z-10" @close="editWidgetSchema = null">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <form @submit.prevent="updateWidgetSchema">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-4xl sm:w-full sm:p-6">
              <div class="text-center">
                <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Edit widget schema
                </DialogTitle>
              </div>
              <JsonEditor :schema="getWidgetSchema(editWidgetSchema, true)"
                          property="schema"
                          :has-delete-button="false"
                          class="w-full min-h-96"
                          :allow-edit-schema="true"
                          :allow-lookup="false"
                          :disable-collapse="true"
                          :locale="locale">
              </JsonEditor>
              <div class="pt-3 text-right space-x-1.5">
                <button type="button" @click="editWidgetSchema = null"
                        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2">
                  Close
                </button>
                <button type="submit"
                        class="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded">
                  Save
                </button>
              </div>
            </DialogPanel>
          </form>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Reset Widget Schema Modal -->
  <TransitionRoot as="template" :show="showResetSchema !== null">
    <Dialog as="div" class="relative z-10" @close="showResetSchema = null">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <CheckIcon class="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Confirmation.
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to reset schema of this widget?</p>
                    <span class="text-xs">All schema changes will be deleted.</span>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="showResetSchema = null" type="button"
                        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2">
                  No, cancel
                </button>
                <button @click="resetWidgetSchema()" type="button"
                        class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded">
                  Yes, I'm sure
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Delete Project Modal -->
  <TransitionRoot as="template" :show="showDeleteProjectModal">
    <Dialog as="div" class="relative z-10" @close="showDeleteProjectModal = false">
      <div class="fixed z-10 inset-0 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
        <div class="flex items-center sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrashIcon class="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true"/>
                </div>
                <div class="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Delete Project
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to delete
                      <strong>{{ project?.Name }}</strong>?</p>
                    <p class="text-xs text-red-500 mt-2">This will remove all flows, nodes and resources from the cluster. This action cannot be undone.</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense text-center">
                <button @click="showDeleteProjectModal = false" type="button"
                        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2">
                  Cancel
                </button>
                <button @click="deleteProject()" type="button" :disabled="deletingProject"
                        class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded inline-flex justify-center items-center">
                  <span>Delete</span>
                  <SmallLoadingCircle v-if="deletingProject" class="ml-2"></SmallLoadingCircle>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Export Project Modal -->
  <ProjectExportModal
    v-if="showExportModal && project"
    :project-name="project.ResourceName || project.resourcename"
    @close="showExportModal = false"
  />

  <!-- Import Project Modal -->
  <ProjectImportModal
    v-if="showImportModal && project"
    :project-name="project.ResourceName || project.resourcename"
    @close="showImportModal = false"
    @success="reloadProject"
  />

  <!-- Recover Project Modal — shown when the cluster's TinyProject CR is missing -->
  <ProjectRecoverModal
    v-if="showRecoverModal"
    :project-name="projectName"
    @close="showRecoverModal = false; projectMissingInCluster = false"
    @success="() => { showRecoverModal = false; projectMissingInCluster = false; reloadProject() }"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { notify } from 'notiwind'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  CheckIcon,
  EllipsisVerticalIcon
} from '@heroicons/vue/24/solid'
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

// The backend seam + host facts, provided down the editor tree. The host
// passes a transport-bound EditorClient in via props (in place of the
// platform's useNuxtApp().$grpc / useAuthStore()); we provide it plus an
// empty EditorContext.
import { provideEditorClient, provideEditorContext, useEditorContext, type EditorClient } from './store/client'
import { useActivityStore } from './store/activity'
import { useSubscriptionStore } from './store/subscription'
import { navigateTo } from './support/nav'
import { defaultLocale } from './json-editor/common'

import InlineOverlay from './canvas/InlineOverlay.vue'
import MagicTheater from './agent-theater/MagicTheater.vue'
import FlowPreview from './canvas/FlowPreview.vue'
import CreateFlow from './project/CreateFlow.vue'
import RenameFlow from './project/RenameFlow.vue'
import CreateNewDashboardPage from './project/CreateNewDashboardPage.vue'
import Widget from './dashboard/Widget.vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import SmallLoadingCircle from './support/SmallLoadingCircle.vue'
import ProjectListItem from './project/ProjectListItem.vue'
import Pagination from './project/Pagination.vue'
import { default as JsonEditor } from './json-editor/JSONEditor.vue'
import ProjectExportModal from './project/ProjectExportModal.vue'
import ProjectImportModal from './project/ProjectImportModal.vue'
import ProjectRecoverModal from './project/ProjectRecoverModal.vue'

// Public API — the host mounts <ProjectWorkspace :client :project-name />.
// These replace the page's route params + useNuxtApp().$grpc.
const props = defineProps<{
  client: EditorClient
  projectName: string
}>()

// Navigation to open a flow is surfaced to the host: it owns routing and
// constructs its own URLs. Everything else the shell handles internally.
const emit = defineEmits<{
  (e: 'open-flow', flowResourceName: string): void
}>()

// Provide the backend seam and (empty) context at the top of the tree so all
// lifted components inject them instead of reaching for Nuxt globals.
provideEditorClient(props.client)
provideEditorContext({})

const client = props.client
const editorCtx = useEditorContext()
const subscriptionStore = useSubscriptionStore()
const activity = useActivityStore()

// Nav shim — a full-page navigation the host can intercept, used only for the
// non-flow controls (back-to-projects, configure, delete redirect). Flow
// navigation goes through emit('open-flow', ...) instead.
const _navigateTo = navigateTo

// State
// Default to the Flows tab — it's the primary content (and where the editor's
// back button should land), not the activity feed.
const TABS = ['theater', 'widgets', 'flows'] as const
type TabName = (typeof TABS)[number]

const tab = ref<TabName>('flows')

// --- Tab routing ---------------------------------------------------------
// The selected tab is mirrored into the URL (?tab=…) so a view is linkable,
// survives a refresh, and answers browser back/forward.
//
// Deliberately the History API rather than vue-router: this component ships
// inside three different hosts (tiny's local SPA, the platform Nuxt app, the
// desktop client). Depending on a router would force one on hosts that don't
// have it and fight the one in hosts that do. A query param is also safer
// than a hash, which would collide with hash-based host routing.

const isBrowser = () => typeof window !== 'undefined'

function tabFromURL(): TabName | null {
  if (!isBrowser()) return null
  const value = new URLSearchParams(window.location.search).get('tab')
  return (TABS as readonly string[]).includes(value ?? '') ? (value as TabName) : null
}

// Set while adopting a tab that came FROM the URL, so the watcher below
// doesn't push a second history entry for a navigation the browser just made.
let applyingFromURL = false

function adopt(name: TabName) {
  applyingFromURL = true
  tab.value = name
  nextTick(() => {
    applyingFromURL = false
  })
}

// replace=true canonicalises the initial URL without adding a history entry —
// otherwise the first Back press would just strip the query and look broken.
function syncTabToURL(name: TabName, replace = false) {
  if (!isBrowser()) return
  const url = new URL(window.location.href)
  if (url.searchParams.get('tab') === name) return
  url.searchParams.set('tab', name)
  window.history[replace ? 'replaceState' : 'pushState']({ tab: name }, '', url)
}

function onPopState() {
  // No ?tab= (e.g. stepped back past our first entry) → fall back to the
  // default rather than stranding the user on whatever was last shown.
  const next = tabFromURL() ?? 'flows'
  if (next !== tab.value) adopt(next)
}

watch(tab, (next) => {
  if (applyingFromURL) return // came from the URL; history already reflects it
  syncTabToURL(next)
})
const loading = ref(false)
const loadingStatus = ref('')
const connected = ref(false)
const error = ref<string | null>(null)

const project = ref<any>(null)
const server = ref<any>(null)
const accessMap = ref<any>(null)
const projectStat = ref<any>(null)

const flows = ref<any[]>([])
const widgets = ref<any[]>([])
const dashboardPages = ref<any[]>([])
const dashboardPage = ref<string | null>(null)

const traceRate = ref<string | null>(null)
const errorRate = ref<string | null>(null)
const locale = ref(defaultLocale) // For json-editor

// Projects list sidebar
const projects = ref<any[]>([])
const projectsLoading = ref(false)
const projectSearch = ref('')
const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  const q = projectSearch.value.toLowerCase()
  return projects.value.filter((p: any) => (p.Name || p.name || '').toLowerCase().includes(q))
})
const projectPageCount = ref(0)
// Sidebar pagination. On the platform this was persisted in the URL
// (`?page=2`); as a mountable component there's no router, so it starts at
// the first page and lives in local state for the component's lifetime.
const projectActivePage = ref(0)

// Modals
const openNewFlowModal = ref(false)
const renameFlowTarget = ref<any>(null)
const deleteFlowTarget = ref<any>(null)
const deletingFlow = ref(false)
const showDeletePageModal = ref(false)
const addPageModal = ref(false)
const isLayoutEditing = ref(false)
const editWidgetSchema = ref<any>(null)
const showResetSchema = ref<any>(null)
// Track widget IDs with pending schema changes (reset/edit) that haven't been saved yet.
// Prevents real-time stream events from overwriting local schema before saveWidgets() runs.
const pendingSchemaChanges = ref<Set<string>>(new Set())
const showDeleteProjectModal = ref(false)
const deletingProject = ref(false)
const showExportModal = ref(false)
const showImportModal = ref(false)
// projectMissingInCluster is set when GetStream emits PROJECT_MISSING_IN_CLUSTER —
// the TinyProject CR is gone but the DB still has the record. The recovery modal
// is auto-opened so the user can rebuild the cluster resources from DB.
const projectMissingInCluster = ref(false)
const showRecoverModal = ref(false)

// Flow limit
const flowCount = computed(() => flows.value.length)

const isFlowLimitReached = computed(() => {
  const limit = subscriptionStore.flowLimitPerProject
  if (limit < 0) return false // unlimited
  return flowCount.value >= limit
})

const flowLimitLabel = computed(() => {
  const limit = subscriptionStore.flowLimitPerProject
  return limit < 0 ? `${flowCount.value} flows` : `${flowCount.value}/${limit} flows`
})

const openCreateFlow = () => {
  if (isFlowLimitReached.value) {
    notify({
      group: "error",
      title: "Flow Limit Reached",
      text: `Your plan allows ${subscriptionStore.flowLimitPerProject} flow(s) per project. Upgrade to add more.`
    }, 5000)
    return
  }
  openNewFlowModal.value = true
}

// Stream abort controllers
let streamAbort: AbortController | null = null
let statStreamAbort: AbortController | null = null

// GridStack instance
let grid: any = null

const workspaceSlug = computed(() => {
  // The host may supply the workspace via EditorContext; otherwise the shell
  // runs workspace-agnostic and the slug is empty. Only the (host-owned)
  // back/configure links read it.
  const ws = editorCtx.workspace
  return ws?.Workspace?.SlugUniq || ws?.workspace?.sluguniq || ''
})

// Helper to check access
const checkAccess = (accessMap: any, key: string, defaultValue: boolean = false): boolean => {
  if (!accessMap) return defaultValue
  const access = accessMap.Access || accessMap.access || accessMap
  if (!access) return defaultValue
  return access[key] === true
}

// Get widget schema (uses schema if set, otherwise defaultSchema)
// Handles $ref definitions like the original getSchema function
const getWidgetSchema = (widget: any, configure: boolean = false) => {
  if (!widget) return {}
  let schema = widget.schema || widget.Schema
  if (!schema || Object.keys(schema).length === 0) {
    schema = widget.defaultSchema || widget.DefaultSchema || widget.defaultschema
  }
  if (!schema) return {}

  // Handle $ref definitions (same as original getSchema function)
  if (schema['$ref'] === undefined) {
    return schema
  }

  const ref = (schema['$ref'] as string).replace('#/$defs/', '')
  if (ref === '') {
    return schema
  }
  if (!schema['$defs'] || schema['$defs'][ref] === undefined) {
    return schema
  }

  schema['$defs'][ref]['configure'] = configure
  return schema
}

// Get Tailwind grid column class based on widget grid width (6-column grid like original)
const getWidgetGridClass = (widget: any) => {
  const w = widget.grid?.w || 0
  // Map grid width (1-6) to Tailwind col-span classes
  // If w is 0 or not set, default to full width (6)
  const colSpanMap: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6'
  }
  return colSpanMap[w] || 'col-span-6'
}

// Send signal to node - only handles action button clicks (same as original)
const sendSignal = async (event: any, nodeId: string, portName: string = '_control') => {
  // Only handle action button clicks, not regular value changes
  if (!event?.isAction) return
  if (!nodeId) return

  if (!props.projectName || !project.value) return

  loading.value = true
  try {
    await client.flow.runAction({
      NodeID: nodeId,
      ProjectName: project.value.ResourceName || project.value.resourcename,
      PortName: portName,
      Data: new TextEncoder().encode(JSON.stringify(event.value))
    })
  } catch (e: any) {
    notify({
      group: 'error',
      title: 'Error',
      text: e.message || 'Failed to run action'
    }, 99999)
  } finally {
    loading.value = false
  }
}

// Helper to get project ID (handles both PascalCase and lowercase)
const getProjectId = (proj: any) => proj.Project?.ID || proj.project?.id

// Load projects list for sidebar
const loadProjectsList = async () => {
  projectsLoading.value = true
  try {
    const req: any = {
      PaginationRequest: { Page: projectActivePage.value }
    }
    const resp = await client.project.list(req)
    projects.value = resp.Projects || (resp as any).projects || []

    const pagination = resp.Pagination || (resp as any).pagination
    if (pagination) {
      projectPageCount.value = pagination.PageCount || pagination.pagecount || 0
    }
  } catch (e: any) {
    console.error('Failed to load projects list:', e)
  } finally {
    projectsLoading.value = false
  }
}

const setProjectPage = (page: number) => {
  projectActivePage.value = page
  loadProjectsList()
}

// Parse flow graph from bytes
const parseFlowGraph = (flowItem: any) => {
  const flow = flowItem.Flow || flowItem.flow
  if (!flow) return null

  let graph = {}
  const graphBytes = flow.Graph || flow.graph
  if (graphBytes && graphBytes.length > 0) {
    try {
      const graphStr = new TextDecoder().decode(graphBytes)
      graph = JSON.parse(graphStr)
    } catch (e) {
      console.error('Failed to parse flow graph:', e)
    }
  }

  // Normalize property names (handle both PascalCase and lowercase)
  return {
    ID: flow.ID || flow.id,
    Name: flow.Name || flow.name,
    ResourceName: flow.ResourceName || flow.resourcename,
    Revision: flow.Revision || flow.revision,
    RevisionComment: flow.RevisionComment || flow.revisioncomment || '',
    Num: flow.Num || flow.num,
    graph
  }
}

// Start project stream
const listenStream = async () => {
  const projectName = props.projectName
  if (!projectName) return

  // Cancel any existing stream
  if (streamAbort) {
    streamAbort.abort()
  }
  streamAbort = new AbortController()

  const req: any = {
    ProjectName: projectName,
    PageName: dashboardPage.value || ''
  }

  try {
    for await (const response of client.project.getStream(req, { signal: streamAbort.signal })) {
      connected.value = true

      // Handle different event types
      if (response.Type === 'LOADING') {
        loadingStatus.value = response.Message
        continue
      }

      if (response.Type === 'PROJECT_MISSING_IN_CLUSTER') {
        // TinyProject CR is gone from the cluster but the DB still has it.
        // Open the recovery modal — the user can rebuild from DB.
        loading.value = false
        projectMissingInCluster.value = true
        showRecoverModal.value = true
        continue
      }

      if (response.Type === 'INIT_PROJECT_CONFIGURATION') {
        const config = response.Configuration
        if (config) {
          project.value = config.Project
          accessMap.value = config.Access
          server.value = config.Server
        }
        continue
      }

      if (response.Type === 'INIT_PROJECT') {
        loading.value = false
        const clusterInfo = response.ClusterInfo
        if (clusterInfo) {
          projectStat.value = clusterInfo.Stat

          // Set dashboard pages
          if (!dashboardPage.value) {
            if (clusterInfo.Pages && clusterInfo.Pages.length > 0) {
              dashboardPage.value = clusterInfo.Pages[0]!.Name
            } else {
              // No pages exist yet - set default page name so save can create it
              dashboardPage.value = 'Home'
            }
          }
          dashboardPages.value = clusterInfo.Pages || []

          // Parse flows
          const parsedFlows: any[] = []
          for (const flowItem of (clusterInfo.Flows || [])) {
            const parsed = parseFlowGraph(flowItem)
            if (parsed) {
              parsedFlows.push(parsed)
            }
          }
          flows.value = parsedFlows
        }
        continue
      }

      // Handle dashboard events (widget updates)
      for (const event of (response.DashboardEvent || [])) {
        if (event.Type === 'UPDATE_WIDGET') {
          const widget = event.Widget as any
          if (widget) {
            // Check if widget belongs to current page
            const widgetPages = widget.Pages || widget.pages || []
            if (dashboardPage.value && widgetPages.length > 0 && !widgetPages.includes(dashboardPage.value)) {
              continue
            }

            // Parse schema and data from bytes
            let defaultSchema = {}
            let schema = {}
            let data = {}

            const defaultSchemaBytes = widget.DefaultSchema || widget.defaultschema
            if (defaultSchemaBytes && defaultSchemaBytes.length > 0) {
              try {
                defaultSchema = JSON.parse(new TextDecoder().decode(defaultSchemaBytes))
              } catch (e) {}
            }

            const schemaBytes = widget.Schema || widget.schema
            if (schemaBytes && schemaBytes.length > 0) {
              try {
                schema = JSON.parse(new TextDecoder().decode(schemaBytes))
              } catch (e) {}
            }

            const dataBytes = widget.Data || widget.data
            if (dataBytes && dataBytes.length > 0) {
              try {
                data = JSON.parse(new TextDecoder().decode(dataBytes))
              } catch (e) {}
            }

            // Get grid info - handle both PascalCase and lowercase (same as original buildWidget)
            const gridInfo = widget.Grid || widget.grid || {}

            // Build widget data matching original buildWidget function
            const widgetData: any = {
              ID: widget.ID || widget.id,
              id: widget.ID || widget.id,
              title: widget.Title || '',
              Node: widget.Node || '',
              node: widget.Node || '',
              Port: widget.Port || '_control',
              port: widget.Port || '_control',
              pagesList: widgetPages,
              grid: {
                x: gridInfo.X ?? gridInfo.x ?? 0,
                y: gridInfo.Y ?? gridInfo.y ?? 0,
                w: (gridInfo.W || gridInfo.w) || 6,  // Default width 6 columns (full width)
                h: (gridInfo.H || gridInfo.h) || 3   // Default height 3 rows
              },
              defaultSchema,
              DefaultSchema: defaultSchema,
              schema,
              Schema: schema,
              data,
              Data: data,
              _updateTime: Date.now()  // Track update time for reactivity
            }

            // Update or add widget
            const index = widgets.value.findIndex(w => w.ID === widgetData.ID)
            if (index === -1) {
              widgets.value.push(widgetData)
              // Add widget to GridStack after DOM update
              await nextTick()
              if (grid) {
                makeWidget(widgetData)
              }
            } else {
              // Preserve local schema changes during edit mode or when
              // a widget has pending schema changes (reset/edit) that
              // haven't been saved yet. Without this, stream events
              // overwrite the local schema with stale server data.
              const existing = widgets.value[index]
              if (isLayoutEditing.value || pendingSchemaChanges.value.has(widgetData.ID)) {
                widgetData.schema = existing.schema
                widgetData.Schema = existing.Schema
              }
              // Preserve grid positions during edit mode so user's
              // drag/resize isn't overwritten by stream updates
              if (isLayoutEditing.value) {
                widgetData.grid = existing.grid
              }
              widgets.value[index] = widgetData
            }
          }
        }
      }
    }
  } catch (e: any) {
    // Ignore abort/cancel errors (from refresh or unmount)
    const isCanceled = e.name === 'AbortError' ||
                       (e.message && e.message.includes('[canceled]')) ||
                       (e.message && e.message.includes('signal is aborted'))
    if (!isCanceled) {
      error.value = e.message || 'Stream error'
      connected.value = false
      loading.value = false
      console.error('Project stream error:', e)
    }
  }
}

// Start statistics stream
const listenStatStream = async () => {
  const projectName = props.projectName
  if (!projectName) return

  // Cancel any existing stream
  if (statStreamAbort) {
    statStreamAbort.abort()
  }
  statStreamAbort = new AbortController()

  const req: any = {
    ProjectName: projectName
  }

  try {
    for await (const response of client.statistics.getStream(req, { signal: statStreamAbort.signal })) {
      for (const event of (response.Events || [])) {
        if (event.Metric === 'tiny_trace_count') {
          traceRate.value = event.Value ? event.Value.toFixed(2) : null
        } else if (event.Metric === 'tiny_span_error_count') {
          errorRate.value = event.Value ? event.Value.toFixed(2) : null
        }
      }
    }
  } catch (e: any) {
    // Ignore abort/cancel errors (from refresh or unmount)
    const isCanceled = e.name === 'AbortError' ||
                       (e.message && e.message.includes('[canceled]')) ||
                       (e.message && e.message.includes('signal is aborted'))
    if (!isCanceled) {
      console.error('Statistics stream error:', e)
    }
  }
}

const loadProject = () => {
  widgets.value = []
  flows.value = []
  loading.value = true
  error.value = null
  connected.value = false
  isLayoutEditing.value = false
  listenStream()
  listenStatStream()
}

const reloadProject = () => {
  // Reset grid before reloading
  if (grid) {
    grid.disable()
    grid.removeAll()
  }
  loadProject()
}

const changePage = (pageName: string) => {
  if (grid) {
    grid.removeAll(true)
  }
  dashboardPage.value = pageName
  loadProject()
}

const deletePage = async () => {
  if (!dashboardPage.value || !project.value) return

  try {
    await client.project.deleteDashboardPage({
      ProjectName: props.projectName,
      PageName: dashboardPage.value
    })
    showDeletePageModal.value = false
    dashboardPage.value = null
    reloadProject()
  } catch (e: any) {
    notify({
      group: 'error',
      title: 'Error',
      text: e.message || 'Failed to delete page'
    }, 99999)
  }
}

const saveWidgets = async () => {
  if (!project.value || !dashboardPage.value) return
  if (!grid) return

  loading.value = true

  try {
    // Get current grid positions from GridStack (same as original)
    const result = grid.save(false)
    const widgetData: any[] = []

    for (const res of result) {
      // Create widget with ID and Grid (always added, same as original)
      const saveWidget: any = {
        ID: res.id,
        Grid: {
          X: res.x,
          Y: res.y,
          W: res.w,
          H: res.h
        }
      }

      // Find the corresponding widget to get its other properties (same as original)
      const index = widgets.value.findIndex((w: any) => w.id === res.id)

      // Only set schema/title/pages if widget found (same as original)
      if (index > -1) {
        const widget = widgets.value[index]

        // Only set defaultSchema if it exists and is not empty (same as original: !== '')
        const defaultSchema = widget.defaultSchema || widget.DefaultSchema
        if (defaultSchema && Object.keys(defaultSchema).length > 0) {
          saveWidget.DefaultSchema = new TextEncoder().encode(JSON.stringify(defaultSchema))
        }

        // Only set schema if it exists and is not empty (same as original: !== '')
        const schema = widget.schema || widget.Schema
        if (schema && Object.keys(schema).length > 0) {
          saveWidget.Schema = new TextEncoder().encode(JSON.stringify(schema))
        }

        saveWidget.Title = widget.title || ''
        saveWidget.Pages = widget.pagesList || []
      }

      // Always push widget (same as original - push is outside the if block)
      widgetData.push(saveWidget)
    }

    await client.project.saveWidgets({
      ProjectName: project.value.ResourceName || project.value.resourcename,
      PageName: dashboardPage.value,
      Widgets: widgetData
    })
    // Clear pending schema changes after successful save
    pendingSchemaChanges.value.clear()
  } catch (e: any) {
    notify({
      group: 'error',
      title: 'Error',
      text: e.message || 'Failed to save widgets'
    }, 99999)
  } finally {
    loading.value = false
  }
}

const initGrid = () => {
  grid = GridStack.init({
    column: 6,
    cellHeight: 90,
    minRow: 1,
    margin: 6,
    removable: '.trash',
    columnOpts: { columnMax: 6, breakpoints: [{w: 0, c: 6}] },
    acceptWidgets: true,
    disableResize: !isLayoutEditing.value,
    disableDrag: !isLayoutEditing.value,
  })
}

const makeWidget = (item: any) => {
  const elSelector = `#${item.id}`
  grid.makeWidget(elSelector)
}

const toggleLayoutEdit = () => {
  if (grid) {
    if (isLayoutEditing.value) {
      grid.disable()
      saveWidgets()
    } else {
      grid.enable()
    }
  }
  isLayoutEditing.value = !isLayoutEditing.value
}

const editWidget = (widget: any) => {
  editWidgetSchema.value = JSON.parse(JSON.stringify(widget))
}

const updateWidgetData = async (widget: any) => {
  const index = widgets.value.findIndex((w: any) => w.id === widget.id)
  if (index === -1) {
    widgets.value.push(widget)
    await nextTick()
    if (grid) {
      makeWidget(widget)
    }
  } else {
    widgets.value[index] = widget
  }
}

const updateWidgetSchema = () => {
  if (editWidgetSchema.value) {
    pendingSchemaChanges.value.add(editWidgetSchema.value.ID)
    updateWidgetData(editWidgetSchema.value)
    editWidgetSchema.value = null
    saveWidgets()
  }
}

const resetWidgetSchema = () => {
  if (!showResetSchema.value) {
    return
  }
  const widget = widgets.value.find((w: any) => w.id === showResetSchema.value.id)
  if (widget) {
    pendingSchemaChanges.value.add(widget.ID)
    widget.schema = {}
    updateWidgetData(widget)
  }
  showResetSchema.value = null
  saveWidgets()
}

const goToFlow = (flow: any) => {
  // The host owns flow routing: hand it the flow's resource name and let it
  // decide how to open it. The shell never builds platform URLs.
  if (flow.ResourceName) {
    emit('open-flow', flow.ResourceName)
  }
}

const createFlowSuccess = () => {
  openNewFlowModal.value = false
  reloadProject()
}

const renameSuccess = () => {
  renameFlowTarget.value = null
  reloadProject()
}

const doDeleteFlow = async () => {
  if (!deleteFlowTarget.value) return

  deletingFlow.value = true
  try {
    const req: any = {
      FlowID: deleteFlowTarget.value.ID
    }
    await client.flow.undeployFlow(req)

    notify({
      group: "generic",
      title: "Success",
      text: "Flow deleted successfully"
    }, 5000)

    deleteFlowTarget.value = null
    reloadProject()
  } catch (e: any) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'Failed to delete flow'
    }, 99999)
  } finally {
    deletingFlow.value = false
  }
}

const deleteProject = async () => {
  if (!project.value) return

  deletingProject.value = true
  try {
    const req: any = {
      ProjectName: project.value.ResourceName || project.value.resourcename
    }
    await client.project.delete(req)

    notify({
      group: "generic",
      title: "Success",
      text: "Project deleted successfully"
    }, 5000)

    showDeleteProjectModal.value = false
    navigateTo(`/${workspaceSlug.value}/projects`)
  } catch (e: any) {
    notify({
      group: "error",
      title: "Error",
      text: e.message || 'Failed to delete project'
    }, 99999)
  } finally {
    deletingProject.value = false
  }
}

// Reload when the host swaps the project prop (navigating between projects
// without remounting the shell).
watch(() => props.projectName, (newVal, oldVal) => {
  // Skip initial call - handled by onMounted
  if (oldVal === undefined) return
  dashboardPage.value = null
  loadProject()
  activity.start(props.projectName)
})

onMounted(() => {
  // Adopt the tab named in the URL so a shared link / refresh lands on the
  // right view; otherwise stamp the default so the URL is always explicit.
  const urlTab = tabFromURL()
  if (urlTab) {
    adopt(urlTab)
  } else {
    syncTabToURL(tab.value, true)
  }
  if (isBrowser()) window.addEventListener('popstate', onPopState)

  // Initialize GridStack
  initGrid()
  // Load current project (single project per session — no project list)
  loadProject()
  // Fetch subscription for limit checks
  subscriptionStore.fetchSubscription()
  // Wire the agent activity feed to the injected client and open its stream
  // for this project.
  activity.setGrpcClient(props.client)
  activity.start(props.projectName)
})

onUnmounted(() => {
  if (isBrowser()) window.removeEventListener('popstate', onPopState)
  if (streamAbort) {
    streamAbort.abort()
  }
  if (statStreamAbort) {
    statStreamAbort.abort()
  }
})

onBeforeUnmount(() => {
  activity.stop()
})
</script>
