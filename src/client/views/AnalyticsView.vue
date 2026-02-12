<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AppSpinner, AppButton, AppIcon } from '../components/atoms'
import { ActivityChart } from '../components/organisms'

interface EventCount {
  event: string
  count: string
}

interface DailyEvent {
  date: string
  count: string
}

interface DailyBreakdown {
  date: string
  event: string
  count: string
}

interface RecentEvent {
  event: string
  properties: Record<string, unknown>
  session_id: string
  url: string
  created_at: string
}

interface AnalyticsStats {
  // Database metrics
  total_projects: number
  total_folders: number
  total_assets: number
  total_storage: number
  // Event tracking
  event_counts: EventCount[]
  unique_visitors: number
  daily_events: DailyEvent[]
  daily_breakdown: DailyBreakdown[]
  recent_events: RecentEvent[]
}

const ANALYTICS_PASSWORD = 'lisa_123'
const STORAGE_KEY = 'analytics_authenticated'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const stats = ref<AnalyticsStats | null>(null)

// Password protection
const isAuthenticated = ref(sessionStorage.getItem(STORAGE_KEY) === 'true')
const passwordInput = ref('')
const passwordError = ref(false)

function handleLogin() {
  if (passwordInput.value === ANALYTICS_PASSWORD) {
    isAuthenticated.value = true
    sessionStorage.setItem(STORAGE_KEY, 'true')
    passwordError.value = false
    fetchStats()
  } else {
    passwordError.value = true
  }
}

const totalEvents = computed(() => {
  if (!stats.value) return 0
  return stats.value.event_counts.reduce((sum, e) => sum + parseInt(e.count), 0)
})

const eventLabels: Record<string, string> = {
  project_created: 'Projects Created',
  project_opened: 'Projects Opened',
  project_deleted: 'Projects Deleted',
  project_renamed: 'Projects Renamed',
  asset_uploaded: 'Assets Uploaded',
  asset_downloaded: 'Assets Downloaded',
  asset_deleted: 'Assets Deleted',
  folder_created: 'Folders Created',
  icon_generated: 'Icons Generated',
  icon_added: 'Icons Added',
  bulk_download: 'Bulk Downloads',
  bulk_delete: 'Bulk Deletes',
  page_view: 'Page Views'
}

function formatEventName(event: string): string {
  return eventLabels[event] || event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function fetchStats() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/analytics/stats')
    if (!response.ok) throw new Error('Failed to fetch analytics')
    stats.value = await response.json()
  } catch (e) {
    console.error('Failed to fetch analytics:', e)
    error.value = 'Failed to load analytics data'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    fetchStats()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="analytics-view">
    <!-- Password Gate -->
    <div v-if="!isAuthenticated" class="analytics-view__login">
      <div class="login-card">
        <AppIcon name="chart" :size="48" class="login-card__icon" />
        <h1>Analytics Dashboard</h1>
        <p>Enter password to access analytics</p>
        <form @submit.prevent="handleLogin" class="login-card__form">
          <input
            v-model="passwordInput"
            type="password"
            placeholder="Password"
            class="login-card__input"
            :class="{ 'login-card__input--error': passwordError }"
            autofocus
          />
          <p v-if="passwordError" class="login-card__error">Incorrect password</p>
          <AppButton type="submit" class="login-card__button">
            Access Dashboard
          </AppButton>
        </form>
        <AppButton variant="ghost" size="sm" @click="router.push('/')" class="login-card__back">
          <AppIcon name="back" :size="16" />
          Back to Projects
        </AppButton>
      </div>
    </div>

    <!-- Authenticated Content -->
    <template v-else>
      <!-- Header -->
      <header class="analytics-view__header">
        <div class="analytics-view__header-left">
          <AppButton variant="ghost" size="sm" @click="router.push('/')">
            <AppIcon name="back" :size="18" />
          </AppButton>
          <h1>Analytics Dashboard</h1>
        </div>
        <AppButton variant="secondary" size="sm" @click="fetchStats" :disabled="loading">
          <AppIcon name="refresh" :size="16" />
          Refresh
        </AppButton>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="analytics-view__loading">
      <AppSpinner size="lg" />
      <p>Loading analytics...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="analytics-view__error">
      <AppIcon name="alert-circle" :size="48" />
      <p>{{ error }}</p>
      <AppButton @click="fetchStats">Try Again</AppButton>
    </div>

    <!-- Content -->
    <main v-else-if="stats" class="analytics-view__content">
      <!-- Database Metrics -->
      <h2 class="analytics-view__section-title">Database Overview</h2>
      <div class="analytics-view__cards">
        <div class="stat-card stat-card--highlight">
          <div class="stat-card__value">{{ stats.total_projects }}</div>
          <div class="stat-card__label">Projects</div>
        </div>
        <div class="stat-card stat-card--highlight">
          <div class="stat-card__value">{{ stats.total_folders }}</div>
          <div class="stat-card__label">Folders</div>
        </div>
        <div class="stat-card stat-card--highlight">
          <div class="stat-card__value">{{ stats.total_assets }}</div>
          <div class="stat-card__label">Assets</div>
        </div>
        <div class="stat-card stat-card--highlight">
          <div class="stat-card__value">{{ formatStorage(stats.total_storage) }}</div>
          <div class="stat-card__label">Storage Used</div>
        </div>
      </div>

      <!-- Activity Metrics -->
      <h2 class="analytics-view__section-title">Activity (Last 30 Days)</h2>
      <div class="analytics-view__cards">
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.unique_visitors }}</div>
          <div class="stat-card__label">Unique Visitors</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ totalEvents }}</div>
          <div class="stat-card__label">Total Events</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.event_counts.length }}</div>
          <div class="stat-card__label">Event Types</div>
        </div>
      </div>

      <!-- Daily Activity Chart -->
      <ActivityChart
        :daily-events="stats.daily_events"
        :daily-breakdown="stats.daily_breakdown || []"
        :event-labels="eventLabels"
      />

      <!-- Event Counts -->
      <section class="analytics-view__section">
        <h2>Events (Last 30 Days)</h2>
        <div class="event-list">
          <div
            v-for="event in stats.event_counts"
            :key="event.event"
            class="event-item"
          >
            <span class="event-item__name">{{ formatEventName(event.event) }}</span>
            <span class="event-item__count">{{ event.count }}</span>
          </div>
          <div v-if="stats.event_counts.length === 0" class="event-list__empty">
            No events recorded yet
          </div>
        </div>
      </section>

      <!-- Recent Events -->
      <section class="analytics-view__section">
        <h2>Recent Events</h2>
        <div class="recent-events">
          <div
            v-for="(event, index) in stats.recent_events"
            :key="index"
            class="recent-event"
          >
            <div class="recent-event__main">
              <span class="recent-event__name">{{ formatEventName(event.event) }}</span>
              <span class="recent-event__time">{{ formatTime(event.created_at) }}</span>
            </div>
            <div v-if="Object.keys(event.properties).length > 0" class="recent-event__props">
              <span v-for="(value, key) in event.properties" :key="key" class="recent-event__prop">
                {{ key }}: {{ value }}
              </span>
            </div>
          </div>
          <div v-if="stats.recent_events.length === 0" class="recent-events__empty">
            No events recorded yet
          </div>
        </div>
      </section>
    </main>
    </template>
  </div>
</template>

<style scoped>
.analytics-view {
  min-height: 100vh;
  background: var(--color-bg);
}

.analytics-view__login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.login-card__icon {
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.login-card h1 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-xs) 0;
}

.login-card p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--space-lg) 0;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.login-card__input {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  text-align: center;
}

.login-card__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.login-card__input--error {
  border-color: var(--color-error);
}

.login-card__error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin: 0;
}

.login-card__button {
  width: 100%;
}

.login-card__back {
  margin-top: var(--space-lg);
}

.analytics-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--color-border);
  background: var(--bg-secondary);
}

.analytics-view__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.analytics-view__header h1 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.analytics-view__loading,
.analytics-view__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxl);
  gap: var(--space-md);
  color: var(--color-text-secondary);
}

.analytics-view__error {
  color: var(--color-error);
}

.analytics-view__content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.analytics-view__section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-md) 0;
  color: var(--color-text-secondary);
}

.analytics-view__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.stat-card__value {
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.stat-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}

.stat-card--highlight {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.stat-card--highlight .stat-card__value {
  color: var(--color-primary);
}

.analytics-view__section {
  background: var(--bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.analytics-view__section h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-md) 0;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.event-item__name {
  font-size: var(--font-size-sm);
}

.event-item__count {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.event-list__empty,
.recent-events__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-lg);
}

.recent-events {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-height: 400px;
  overflow-y: auto;
}

.recent-event {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.recent-event__main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-event__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.recent-event__time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.recent-event__props {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.recent-event__prop {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
</style>
