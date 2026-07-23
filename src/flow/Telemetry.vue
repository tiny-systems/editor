<template>
  <!-- No own border-t: the flow page owns the section border. -->
  <div class="w-full text-sm relative flex flex-col dark:border-gray-700">
    <!-- Clickable header bar (hidden when embedded in the Activity panel) -->
    <div
      v-if="!embedded"
      class="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      @click="onHeaderClick"
    >
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Telemetry</span>
        <!-- Metrics summary -->
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span v-if="items.length > 0" class="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
            {{ items.length }} traces
          </span>
          <button
            v-if="totalErrors > 0"
            type="button"
            @click.stop="errorsOnly = !errorsOnly"
            :title="errorsOnly ? 'Showing only traces with errors — click to show all' : 'Show only traces with errors'"
            :class="['px-1.5 py-0.5 rounded transition-colors cursor-pointer',
                     errorsOnly
                       ? 'bg-red-600 text-white ring-1 ring-red-700'
                       : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800']"
          >
            {{ totalErrors }} errors
          </button>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <!-- Collapse/expand chevron -->
        <ChevronUpIcon v-if="isCollapsed" class="w-4 h-4 text-gray-400" />
        <ChevronDownIcon v-else class="w-4 h-4 text-gray-400" />
        <!-- Refresh button -->
        <button
          @click.stop="loadTraces(true)"
          class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Refresh traces"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Collapsible content.
         Height is deliberately NOT gated on hasData: that flag means "the
         chart has series", but the trace LIST renders either way. Gating on it
         left the panel entirely unconstrained whenever traces existed without
         chart data, so it grew to fit every row and swallowed the canvas — and
         it made the drag handle look broken, because it kept updating
         --exec-h while nothing consumed it. -->
    <div v-if="embedded || !isCollapsed" :class="['relative overflow-hidden', embedded ? 'min-h-72 h-[30vh]' : '']" :style="!embedded ? { height: 'var(--exec-h, 25vh)' } : undefined">
      <InlineOverlay v-if="!connected" hide-loading>
        <div class="flex items-center gap-3">
          <span class="text-red-500">{{ error || 'Connection lost.' }}</span>
          <button class="text-indigo-500 hover:text-indigo-600 font-medium" @click="connect">Reload</button>
        </div>
      </InlineOverlay>
      <div class="h-full dark:text-gray-300">
        <div class="h-1/3 relative" v-if="hasData">
          <VChart
            ref="chartRef"
            :option="chartOption"
            :theme="isDark ? 'dark' : undefined"
            :autoresize="true"
            @datazoom="onDataZoom"
          />
        </div>
        <div v-else class="text-center p-2 text-xs font-mono text-gray-500">
          No data
        </div>
        <div :class="[hasData ? 'h-2/3' : '', 'relative']">
          <div class="flex flex-col h-full m-auto overflow-y-scroll bg-gray-500/5 font-mono dark:text-gray-300" ref="scroller">
            <table>
              <tr v-if="items.length === 0"><td class="text-center text-xs p-3 dark:text-gray-500">No activity. The trace list is empty.</td></tr>
              <tr :class="['text-left text-xs hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer', trace && item.ID == trace ? 'bg-gray-300 dark:bg-gray-700' : '']" v-for="item in visibleItems" :key="item.ID" @click="selectTrace(item)">
                <td><span class="p-1 block" :title="item.ID">{{ item.ID }}</span></td>
                <td><span class="p-1 block">{{ formatTime(new Date(Number(item.Start) / 1000)) }}</span></td>
                <td><span class="p-1 block"><TimeAgo :datetime="Number(item.End) / 1000" :auto-update="true" /></span></td>
                <td><span>{{ formatDuration(item.Duration) }}</span></td>
                <td><span class="p-1 block bg-indigo-300 dark:bg-indigo-700 text-white" title="Spans">Spans: {{ Number(item.Spans) }}</span></td>
                <td><span v-if="Number(item.Errors) > 0" class="p-1 block bg-red-300 text-white" title="Errors">Errors: {{ Number(item.Errors) }}</span></td>
                <td><span class="p-1 block text-black dark:text-white" title="Bytes">Data: {{ Number(item.Length) }} bytes</span></td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useInfiniteScroll, useDark } from '@vueuse/core'
import { ref, reactive, watch, onMounted, onUnmounted, defineComponent, computed, shallowRef } from 'vue'
import { debounce } from 'vue-debounce'
import { notify } from 'notiwind'
import { useFlowStore } from '../store/flow'
import { useEditorClient } from '../store/client'
import InlineOverlay from '../canvas/InlineOverlay.vue'
import TimeAgo from '../support/TimeAgo.vue'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// Register ECharts components
use([
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent,
  CanvasRenderer
])

const debounceEventDuration = 300

export default defineComponent({
  components: {
    InlineOverlay,
    TimeAgo,
    VChart,
    ChevronUpIcon,
    ChevronDownIcon
  },
  props: {
    trace: {
      type: String
    },
    // When embedded in the Activity panel, render headerless + always-open.
    embedded: {
      type: Boolean,
      default: false
    },
    // Parent-controlled collapse (the flow page collapses RUNS + TELEMETRY
    // as ONE section). Undefined = panel manages itself.
    collapsed: {
      type: Boolean,
      default: undefined
    },
    flowName: {
      type: String,
      required: true
    },
    projectName: {
      type: String,
      required: true
    }
  },
  emits: ['trace', 'toggle'],
  setup(props, { emit }) {
    const client = useEditorClient()
    const flowStore = useFlowStore()

    const scroller = ref<HTMLElement | null>(null)
    const chartRef = shallowRef<InstanceType<typeof VChart> | null>(null)
    let stream: any = null
    let isMounted = true

    const localCollapsed = ref(false)
    const isCollapsed = computed(() => props.collapsed !== undefined ? props.collapsed : localCollapsed.value)
    const onHeaderClick = () => {
      if (props.collapsed !== undefined) emit('toggle')
      else localCollapsed.value = !localCollapsed.value
    }
    const items = ref<any[]>([])
    const start = ref(0)
    const end = ref(0)
    const offset = ref(0)
    const error = ref('')
    const connected = ref(false)
    const isLoading = ref(false)

    // Series data storage
    const seriesData = reactive<Record<string, Array<[number, number]>>>({})
    const seriesNames = ref<string[]>([])

    const isDark = useDark()

    const hasData = computed(() => seriesNames.value.length > 0)

    // Metrics summary for header
    // Clicking the errors badge filters the list instead of collapsing the
    // panel. The badge sits inside the header's collapse handler, so it had no
    // handler of its own and every click just toggled the whole section — it
    // looked like a filter and behaved like a chevron.
    //
    // Filtering is client-side: GetTraces takes no errors argument, so this
    // narrows what has been loaded rather than re-querying.
    const errorsOnly = ref(false)
    const visibleItems = computed(() =>
      errorsOnly.value
        ? items.value.filter((i: any) => Number(i.Errors || 0) > 0)
        : items.value
    )

    const totalErrors = computed(() => {
      return items.value.reduce((sum, item) => sum + Number(item.Errors || 0), 0)
    })

    function getMetricColor(m: string) {
      if (m === 'tiny_trace_count') {
        return '#a8e6cf'
      }
      if (m === 'tiny_span_error_count') {
        return '#ffaaa5'
      }
      return '#88ccff'
    }

    // ECharts option configuration
    const chartOption = computed(() => ({
      backgroundColor: 'transparent',
      title: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const date = new Date(params[0].value[0])
          let content = `<strong>${date.toLocaleString()}</strong><br/>`
          params.forEach((p: any) => {
            content += `${p.marker} ${p.seriesName}: ${p.value[1]}<br/>`
          })
          return content
        }
      },
      legend: {
        show: false
      },
      grid: {
        top: 10,
        left: 50,
        right: 20,
        bottom: 40,
        containLabel: false
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: {
            color: isDark.value ? '#333' : '#ccc'
          }
        },
        axisLine: {
          lineStyle: {
            color: isDark.value ? '#333' : '#ccc'
          }
        },
        axisLabel: {
          color: isDark.value ? '#999' : '#666'
        }
      },
      yAxis: {
        type: 'value',
        name: 'Amount',
        nameTextStyle: {
          color: isDark.value ? '#999' : '#666'
        },
        splitLine: {
          lineStyle: {
            color: isDark.value ? '#333' : '#ccc'
          }
        },
        axisLine: {
          lineStyle: {
            color: isDark.value ? '#333' : '#ccc'
          }
        },
        axisLabel: {
          color: isDark.value ? '#999' : '#666'
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 25,
          bottom: 5,
          borderColor: isDark.value ? '#333' : '#ccc',
          fillerColor: isDark.value ? 'rgba(100,100,100,0.3)' : 'rgba(200,200,200,0.3)',
          handleStyle: {
            color: isDark.value ? '#666' : '#aaa'
          },
          textStyle: {
            color: isDark.value ? '#999' : '#666'
          },
          showDetail: false
        }
      ],
      series: seriesNames.value.map(name => ({
        name,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: getMetricColor(name)
        },
        itemStyle: {
          color: getMetricColor(name)
        },
        data: seriesData[name] || []
      }))
    }))

    function onDataZoom(params: any) {
      // Get the chart instance to read the actual axis range
      const chart = chartRef.value
      if (!chart) return

      // When dataZoom changes, we need to update start/end for trace filtering
      // ECharts dataZoom gives us percentage, we need to convert to timestamps
      const option = chart.getOption() as any
      if (option && option.dataZoom && option.dataZoom[0]) {
        const zoom = option.dataZoom[0]
        // Find min/max timestamps from all series data
        let minTime = Infinity
        let maxTime = -Infinity
        for (const name of seriesNames.value) {
          const data = seriesData[name]
          if (data && data.length > 0) {
            minTime = Math.min(minTime, data[0]![0])
            maxTime = Math.max(maxTime, data[data.length - 1]![0])
          }
        }

        if (minTime !== Infinity && maxTime !== -Infinity) {
          const range = maxTime - minTime
          start.value = Math.trunc(minTime + (zoom.start / 100) * range)
          end.value = Math.trunc(minTime + (zoom.end / 100) * range)
          offset.value = 0
          items.value = []
        }
      }
    }

    function formatDuration(nseconds: bigint | number) {
      const ns = typeof nseconds === 'bigint' ? Number(nseconds) : nseconds
      return ns / 1000000 + 'ms'
    }

    function formatTime(date: Date) {
      const opts: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      }
      return new Intl.DateTimeFormat('default', opts).format(date)
    }

    function selectTrace(t: any) {
      emit('trace', t.ID)
    }

    async function loadTraces(reset?: boolean) {
      if (!client) {
        return
      }

      // Prevent concurrent requests
      if (isLoading.value) {
        return
      }

      isLoading.value = true

      if (reset) {
        offset.value = 0
      }

      try {
        const resp = await client.statistics.getTraces({
          ProjectName: props.projectName,
          Offset: BigInt(offset.value),
          Start: BigInt(start.value),
          End: BigInt(end.value)
        })

        if (reset) {
          items.value = []
        }
        items.value.push(...(resp.Traces || []))
        offset.value = Number(resp.Offset) + Number(resp.Total)
      } catch (e: any) {
        notify({
          group: 'error',
          title: 'Error',
          text: e.message || 'unknown server error'
        }, 999999)
      } finally {
        isLoading.value = false
      }
    }

    async function connect() {
      if (!client) return

      connected.value = true

      const dbFn = debounce(() => {
        loadTraces(true)
      }, debounceEventDuration)

      const subscribeTime = new Date()

      // Cancel existing stream
      if (stream) {
        stream = null
      }

      // Start streaming
      try {
        const streamIterator = client.statistics.getStream({
          FlowName: props.flowName,
          ProjectName: props.projectName
        })

        stream = streamIterator

        // Process stream in background
        ;(async () => {
          try {
            for await (const response of streamIterator) {
              // Stop processing if component was unmounted
              if (!isMounted) break

              let i = 0
              for (const e of response.Events || []) {
                const metric = e.Metric || ''

                // Initialize series if new
                if (!seriesData[metric]) {
                  seriesData[metric] = []
                  if (!seriesNames.value.includes(metric)) {
                    seriesNames.value.push(metric)
                  }
                }

                // Add data point [timestamp, value]
                seriesData[metric].push([Number(e.Datetime), e.Value])
                i++
              }

              if (i > 0 && isMounted) {
                const now = new Date()
                // @ts-ignore
                if (now - subscribeTime > debounceEventDuration) {
                  dbFn()
                }
              }
            }
          } catch (e: any) {
            // Only log and update state if still mounted
            if (isMounted) {
              console.error('[Telemetry] Stream error:', e)
              connected.value = false
              error.value = e.message || 'Stream error'
            }
          }
        })()
      } catch (e: any) {
        console.error('[Telemetry] Failed to connect:', e)
        connected.value = false
        error.value = e.message || 'Connection failed'
      }
    }

    // Watch start/end changes
    let watchEnabled = false
    watch([start, end], () => {
      if (watchEnabled) {
        loadTraces(true)
      }
    })

    onMounted(() => {
      loadTraces(true)

      useInfiniteScroll(
        scroller,
        () => {
          loadTraces()
        },
        {
          distance: 10,
          canLoadMore: () => !isLoading.value && items.value.length > 0
        }
      )

      connect()

      // Enable watch for range changes after initial load
      watchEnabled = true
    })

    onUnmounted(() => {
      isMounted = false
      stream = null
    })

    return {
      scroller,
      chartRef,
      isCollapsed,
      onHeaderClick,
      items,
      start,
      end,
      offset,
      error,
      connected,
      hasData,
      totalErrors,
      errorsOnly,
      visibleItems,
      chartOption,
      isDark,
      formatDuration,
      formatTime,
      selectTrace,
      onDataZoom,
      loadTraces,
      connect
    }
  }
})
</script>

<style scoped>
.scroller {
  height: 100%;
}
</style>
