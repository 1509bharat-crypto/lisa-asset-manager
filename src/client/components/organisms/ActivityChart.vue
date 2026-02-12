<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

interface DailyEvent {
  date: string
  count: string
}

interface DailyBreakdown {
  date: string
  event: string
  count: string
}

type ChartType = 'stacked' | 'area'

interface DayData {
  date: string
  label: string
  total: number
  events: Record<string, number>
}

interface Props {
  dailyEvents: DailyEvent[]
  dailyBreakdown: DailyBreakdown[]
  eventLabels: Record<string, string>
}

const props = defineProps<Props>()

const chartType = ref<ChartType>('stacked')
const hoveredDay = ref<number | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref(700)

const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'stacked', label: 'Stacked' },
  { value: 'area', label: 'Area' },
]

// Margins
const margin = { top: 16, right: 16, bottom: 32, left: 40 }
const chartHeight = 220

// Color palette for event types
const eventColors: Record<string, string> = {
  page_view:        '#667eea',
  asset_uploaded:   '#10b981',
  asset_downloaded: '#06b6d4',
  asset_deleted:    '#ef4444',
  project_created:  '#f59e0b',
  project_opened:   '#8b5cf6',
  project_deleted:  '#f43f5e',
  project_renamed:  '#14b8a6',
  folder_created:   '#a78bfa',
  icon_generated:   '#fb923c',
  icon_added:       '#34d399',
  bulk_download:    '#38bdf8',
  bulk_delete:      '#fbbf24',
}

// Normalize server date to YYYY-MM-DD local date string
function toDateKey(serverDate: string): string {
  const d = new Date(serverDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Process data: fill all 14 days
const chartData = computed(() => {
  const days: DayData[] = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: 0,
      events: {}
    })
  }

  // Fill totals
  const totalMap = new Map(props.dailyEvents.map(d => [toDateKey(d.date), parseInt(d.count)]))
  for (const day of days) {
    day.total = totalMap.get(day.date) || 0
  }

  // Fill breakdown
  const eventTypesSet = new Set<string>()
  for (const row of props.dailyBreakdown) {
    eventTypesSet.add(row.event)
    const key = toDateKey(row.date)
    const day = days.find(d => d.date === key)
    if (day) {
      day.events[row.event] = parseInt(row.count)
    }
  }

  return {
    days,
    eventTypes: Array.from(eventTypesSet).sort()
  }
})

// D3 scales
const innerWidth = computed(() => containerWidth.value - margin.left - margin.right)
const innerHeight = computed(() => chartHeight - margin.top - margin.bottom)

const xScale = computed(() =>
  d3.scaleBand()
    .domain(chartData.value.days.map((_, i) => String(i)))
    .range([0, innerWidth.value])
    .padding(0.2)
)

const xScalePoint = computed(() =>
  d3.scaleLinear()
    .domain([0, 13])
    .range([0, innerWidth.value])
)

const yMaxValue = computed(() => {
  if (chartType.value === 'stacked') {
    return Math.max(1, ...chartData.value.days.map(d =>
      Object.values(d.events).reduce((sum, c) => sum + c, 0)
    ))
  }
  return Math.max(1, ...chartData.value.days.map(d => d.total))
})

const yScale = computed(() =>
  d3.scaleLinear()
    .domain([0, yMaxValue.value])
    .nice()
    .range([innerHeight.value, 0])
)

const yTicks = computed(() => yScale.value.ticks(4))

// Stacked bar data using d3.stack
const stackedData = computed(() => {
  const keys = chartData.value.eventTypes
  const data = chartData.value.days.map((day, i) => {
    const row: Record<string, number> = { index: i }
    for (const key of keys) {
      row[key] = day.events[key] || 0
    }
    return row
  })

  const stack = d3.stack<Record<string, number>>()
    .keys(keys)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone)

  return stack(data)
})

// Area path using d3.area
const areaPathD = computed(() => {
  const area = d3.area<DayData>()
    .x((_, i) => xScalePoint.value(i))
    .y0(innerHeight.value)
    .y1(d => yScale.value(d.total))
    .curve(d3.curveMonotoneX)

  return area(chartData.value.days) || ''
})

// Line path using d3.line
const linePathD = computed(() => {
  const line = d3.line<DayData>()
    .x((_, i) => xScalePoint.value(i))
    .y(d => yScale.value(d.total))
    .curve(d3.curveMonotoneX)

  return line(chartData.value.days) || ''
})

// Line points for dots
const linePoints = computed(() =>
  chartData.value.days.map((day, i) => ({
    x: xScalePoint.value(i),
    y: yScale.value(day.total),
    total: day.total
  }))
)

// Tooltip position
const tooltipStyle = computed(() => {
  if (hoveredDay.value === null) return {}
  const i = hoveredDay.value
  const xPct = ((margin.left + xScalePoint.value(i)) / containerWidth.value) * 100
  const flip = i > 9
  return {
    left: flip ? 'auto' : `${xPct}%`,
    right: flip ? `${100 - xPct}%` : 'auto',
    top: '8px'
  }
})

// Active events for tooltip (sorted by count desc)
const tooltipEvents = computed(() => {
  if (hoveredDay.value === null) return []
  const day = chartData.value.days[hoveredDay.value]
  return chartData.value.eventTypes
    .map(e => ({ event: e, count: day.events[e] || 0 }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
})

// Resize observer
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (chartRef.value) {
    containerWidth.value = chartRef.value.clientWidth
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <section class="activity-chart">
    <div class="activity-chart__header">
      <h2>Daily Activity (14 days)</h2>
      <div class="activity-chart__toggle">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          :class="['activity-chart__toggle-btn', { 'activity-chart__toggle-btn--active': chartType === type.value }]"
          @click="chartType = type.value"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <div class="activity-chart__container" ref="chartRef">
      <svg :width="containerWidth" :height="chartHeight" class="activity-chart__svg">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#667eea" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#667eea" stop-opacity="0.03" />
          </linearGradient>
        </defs>

        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- Y-axis gridlines and labels -->
          <g>
            <template v-for="tick in yTicks" :key="tick">
              <line
                :x1="0" :x2="innerWidth"
                :y1="yScale(tick)" :y2="yScale(tick)"
                stroke="#2a2a3a" stroke-dasharray="4 4" stroke-width="0.5"
              />
              <text
                :x="-8" :y="yScale(tick) + 3.5"
                text-anchor="end" fill="#6b6b7b" font-size="10"
              >{{ tick }}</text>
            </template>
          </g>

          <!-- Stacked bars (D3 stack) -->
          <template v-if="chartType === 'stacked'">
            <g v-for="(series, si) in stackedData" :key="si">
              <rect
                v-for="(d, di) in series" :key="di"
                :x="xScale(String(di))"
                :y="yScale(d[1])"
                :width="xScale.bandwidth()"
                :height="Math.max(0, yScale(d[0]) - yScale(d[1]))"
                :fill="eventColors[series.key] || '#666'"
                rx="2"
                :opacity="hoveredDay === null || hoveredDay === di ? 1 : 0.3"
                class="activity-chart__bar-segment"
              />
            </g>
          </template>

          <!-- Area chart -->
          <template v-if="chartType === 'area'">
            <path :d="areaPathD" fill="url(#areaGradient)" />
            <path :d="linePathD" fill="none" stroke="#667eea" stroke-width="2.5" stroke-linecap="round" />
            <circle
              v-for="(pt, i) in linePoints" :key="i"
              :cx="pt.x" :cy="pt.y"
              :r="hoveredDay === i ? 5 : 3.5"
              fill="#667eea" stroke="#12121a" stroke-width="2"
              class="activity-chart__dot"
            />
          </template>

          <!-- Invisible hover zones -->
          <rect
            v-for="(day, i) in chartData.days" :key="'hover-' + day.date"
            :x="chartType === 'stacked' ? xScale(String(i)) : xScalePoint(i) - innerWidth / 28"
            :y="0"
            :width="chartType === 'stacked' ? xScale.bandwidth() : innerWidth / 14"
            :height="innerHeight"
            fill="transparent"
            @mouseenter="hoveredDay = i"
            @mouseleave="hoveredDay = null"
          />

          <!-- X-axis labels -->
          <text
            v-for="(day, i) in chartData.days" :key="'x-' + day.date"
            :x="chartType === 'stacked' ? (xScale(String(i)) || 0) + xScale.bandwidth() / 2 : xScalePoint(i)"
            :y="innerHeight + 20"
            text-anchor="middle" fill="#6b6b7b" font-size="10"
            :style="{ display: i % 2 === 0 ? 'block' : 'none' }"
          >{{ day.label }}</text>
        </g>
      </svg>

      <!-- Tooltip -->
      <div v-if="hoveredDay !== null" class="activity-chart__tooltip" :style="tooltipStyle">
        <div class="activity-chart__tooltip-date">{{ chartData.days[hoveredDay].label }}</div>
        <div class="activity-chart__tooltip-total">{{ chartData.days[hoveredDay].total }} events</div>
        <template v-if="chartType === 'stacked' && tooltipEvents.length > 0">
          <div class="activity-chart__tooltip-divider"></div>
          <div v-for="e in tooltipEvents" :key="e.event" class="activity-chart__tooltip-row">
            <span class="activity-chart__tooltip-dot" :style="{ background: eventColors[e.event] }"></span>
            <span class="activity-chart__tooltip-label">{{ eventLabels[e.event] || e.event }}</span>
            <span class="activity-chart__tooltip-count">{{ e.count }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Legend (stacked mode only) -->
    <div v-if="chartType === 'stacked' && chartData.eventTypes.length > 0" class="activity-chart__legend">
      <div v-for="event in chartData.eventTypes" :key="event" class="activity-chart__legend-item">
        <span class="activity-chart__legend-dot" :style="{ background: eventColors[event] }"></span>
        <span class="activity-chart__legend-label">{{ eventLabels[event] || event }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.activity-chart {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.activity-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.activity-chart__header h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

/* Toggle */
.activity-chart__toggle {
  display: flex;
  background: var(--color-bg);
  border-radius: 20px;
  padding: 2px;
  border: 1px solid var(--color-border);
}

.activity-chart__toggle-btn {
  padding: 5px 14px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.activity-chart__toggle-btn--active {
  background: var(--color-primary);
  color: white;
}

.activity-chart__toggle-btn:hover:not(.activity-chart__toggle-btn--active) {
  color: var(--color-text-primary);
}

/* Chart container */
.activity-chart__container {
  position: relative;
}

.activity-chart__svg {
  display: block;
}

/* Bar animation */
.activity-chart__bar-segment {
  transition: opacity 0.2s ease;
}

/* Dot hover */
.activity-chart__dot {
  transition: r 0.15s ease;
  cursor: pointer;
}

/* Tooltip */
.activity-chart__tooltip {
  position: absolute;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  min-width: 140px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.activity-chart__tooltip-date {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.activity-chart__tooltip-total {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.activity-chart__tooltip-divider {
  height: 1px;
  background: var(--color-border);
  margin: 6px 0;
}

.activity-chart__tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 2px 0;
}

.activity-chart__tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.activity-chart__tooltip-label {
  color: var(--color-text-secondary);
  flex: 1;
}

.activity-chart__tooltip-count {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

/* Legend */
.activity-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm) var(--space-md);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.activity-chart__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.activity-chart__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.activity-chart__legend-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
