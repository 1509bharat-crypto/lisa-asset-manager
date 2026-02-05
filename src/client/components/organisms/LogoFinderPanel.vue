<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  add: [logos: { dataUrl: string; brandName: string }[]]
}>()

const saving = ref(false)

// === ICON GENERATOR STATE ===
interface GeneratedIcon {
  id: string
  subject: string
  dataUrl: string
  status: 'loading' | 'success' | 'error'
  selected: boolean
  error?: string
}

const iconSubject = ref('')
const generatedIcons = ref<GeneratedIcon[]>([])
const generating = ref(false)

// === ICON GENERATOR METHODS ===
const selectedIconCount = computed(() => generatedIcons.value.filter(i => i.selected).length)
const canAddIcons = computed(() => selectedIconCount.value > 0 && !saving.value)

async function generateIcon() {
  const subject = iconSubject.value.trim()
  if (!subject || generating.value) return

  generating.value = true
  const iconId = `icon-${Date.now()}`

  const icon: GeneratedIcon = {
    id: iconId,
    subject,
    dataUrl: '',
    status: 'loading',
    selected: false
  }
  generatedIcons.value.unshift(icon)
  iconSubject.value = ''

  try {
    const response = await fetch('/api/generate-icon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject })
    })

    const data = await response.json()

    if (data.error) {
      icon.status = 'error'
      icon.error = data.error
    } else if (data.data) {
      icon.dataUrl = data.data
      icon.status = 'success'
    }
  } catch (e) {
    console.error('Failed to generate icon:', e)
    icon.status = 'error'
    icon.error = 'Generation failed'
  }

  generating.value = false
}

function toggleIconSelect(icon: GeneratedIcon) {
  if (icon.status === 'success') {
    icon.selected = !icon.selected
  }
}

function selectAllIcons() {
  generatedIcons.value.forEach(i => {
    if (i.status === 'success') i.selected = true
  })
}

function deselectAllIcons() {
  generatedIcons.value.forEach(i => i.selected = false)
}

function removeIcon(id: string) {
  generatedIcons.value = generatedIcons.value.filter(i => i.id !== id)
}

function clearAllIcons() {
  generatedIcons.value = []
}

async function handleAddIcons() {
  const selected = generatedIcons.value.filter(i => i.selected && i.dataUrl)
  if (selected.length === 0) return

  saving.value = true
  const icons = selected.map(i => ({
    dataUrl: i.dataUrl,
    brandName: i.subject
  }))

  emit('add', icons)

  const addedIds = new Set(selected.map(i => i.id))
  generatedIcons.value = generatedIcons.value.filter(i => !addedIds.has(i.id))

  saving.value = false
}
</script>

<template>
  <div class="logo-panel">
    <!-- Header -->
    <div class="logo-panel__header">
      <h3 class="logo-panel__title">Generate Icons</h3>
      <AppButton variant="ghost" size="sm" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </AppButton>
    </div>

    <!-- Search/Input -->
    <div class="logo-panel__search">
      <input
        v-model="iconSubject"
        class="logo-panel__input"
        placeholder="Icon subject (e.g., shopping cart, bell)"
        :disabled="generating"
        @keydown.enter="generateIcon"
      />
      <AppButton
        size="sm"
        @click="generateIcon"
        :disabled="!iconSubject.trim() || generating"
        :loading="generating"
      >
        <AppIcon name="image" :size="14" />
        Generate
      </AppButton>
    </div>

    <div class="logo-panel__source">
      AI-generated flat vector icons
    </div>

    <!-- Results -->
    <div class="logo-panel__results">
      <div v-if="generatedIcons.length > 0" class="logo-panel__selection-bar">
        <span class="logo-panel__count">
          {{ selectedIconCount }} of {{ generatedIcons.length }} selected
        </span>
        <div class="logo-panel__selection-actions">
          <button @click="selectAllIcons">All</button>
          <button @click="deselectAllIcons">None</button>
          <button @click="clearAllIcons">Clear</button>
        </div>
      </div>

      <div class="logo-panel__grid">
        <div
          v-for="icon in generatedIcons"
          :key="icon.id"
          :class="[
            'logo-panel__card',
            { 'logo-panel__card--selected': icon.selected },
            { 'logo-panel__card--error': icon.status === 'error' },
            { 'logo-panel__card--loading': icon.status === 'loading' }
          ]"
          @click="toggleIconSelect(icon)"
        >
          <div class="logo-panel__checkbox" v-if="icon.status === 'success'">
            <AppIcon :name="icon.selected ? 'check-square' : 'square'" :size="16" />
          </div>

          <button class="logo-panel__remove" @click.stop="removeIcon(icon.id)">
            <AppIcon name="x" :size="12" />
          </button>

          <div class="logo-panel__preview">
            <AppSpinner v-if="icon.status === 'loading'" size="sm" />
            <img
              v-else-if="icon.dataUrl"
              :src="icon.dataUrl"
              :alt="icon.subject"
            />
            <div v-if="icon.status === 'error'" class="logo-panel__error">
              <AppIcon name="alert-circle" :size="20" />
            </div>
          </div>

          <div class="logo-panel__name">{{ icon.subject }}</div>
        </div>
      </div>

      <div v-if="generatedIcons.length === 0" class="logo-panel__empty">
        <AppIcon name="image" :size="32" />
        <p>Generate flat vector icons with AI</p>
        <p class="logo-panel__empty-hint">Grey tones, no gradients, transparent BG</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="logo-panel__footer">
      <AppButton
        :disabled="!canAddIcons"
        :loading="saving"
        @click="handleAddIcons"
        class="logo-panel__add-btn"
      >
        <AppIcon name="plus" :size="16" />
        Add {{ selectedIconCount > 0 ? selectedIconCount : '' }} Icon{{ selectedIconCount !== 1 ? 's' : '' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.logo-panel {
  width: 340px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logo-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.logo-panel__search {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  padding-bottom: var(--space-xs);
}

.logo-panel__input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.logo-panel__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.logo-panel__source {
  padding: 0 var(--space-md) var(--space-sm);
  font-size: 11px;
  color: var(--color-text-muted);
}

.logo-panel__results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  padding-top: var(--space-sm);
}

.logo-panel__selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__count {
  font-size: 12px;
  color: var(--color-text-muted);
}

.logo-panel__selection-actions {
  display: flex;
  gap: var(--space-xs);
}

.logo-panel__selection-actions button {
  padding: 2px 8px;
  font-size: 11px;
  background: var(--bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.logo-panel__selection-actions button:hover {
  background: var(--color-primary-light);
}

.logo-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.logo-panel__card {
  position: relative;
  background: var(--bg-primary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  transition: all 0.15s ease;
  overflow: hidden;
  min-width: 0;
}

.logo-panel__card:hover {
  border-color: var(--color-text-muted);
}

.logo-panel__card--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.logo-panel__card--error {
  cursor: not-allowed;
  opacity: 0.5;
}

.logo-panel__card--loading {
  cursor: wait;
}

.logo-panel__checkbox {
  position: absolute;
  top: 4px;
  left: 4px;
  color: var(--color-primary);
}

.logo-panel__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.15s;
}

.logo-panel__card:hover .logo-panel__remove {
  opacity: 1;
}

.logo-panel__remove:hover {
  color: var(--color-error);
}

.logo-panel__preview {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 165 / 112;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
}

.logo-panel__preview img {
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
}

.logo-panel__error {
  color: var(--color-error);
}

.logo-panel__name {
  font-size: 11px;
  font-weight: var(--font-weight-medium);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  color: var(--color-text-primary);
}

.logo-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  color: var(--color-text-muted);
  gap: var(--space-sm);
  text-align: center;
}

.logo-panel__empty p {
  font-size: var(--font-size-sm);
  margin: 0;
}

.logo-panel__empty-hint {
  font-size: 12px !important;
  opacity: 0.7;
}

.logo-panel__footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.logo-panel__add-btn {
  width: 100%;
}
</style>
