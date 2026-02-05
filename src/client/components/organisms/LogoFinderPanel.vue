<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  add: [logos: { dataUrl: string; brandName: string }[]]
}>()

// === TAB STATE ===
type Tab = 'images' | 'generate'
const activeTab = ref<Tab>('images')

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

// === IMAGE SEARCH STATE ===
interface ImageResult {
  id: string
  title: string
  url: string
  thumbnail: string
  width: number
  height: number
  source: string
  status: 'idle' | 'loading' | 'success' | 'error'
  dataUrl: string | null
  selected: boolean
}

const imageSearchQuery = ref('')
const imageResults = ref<ImageResult[]>([])
const searchingImages = ref(false)
const imageSearchAvailable = ref(true)

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

// === IMAGE SEARCH METHODS ===
const selectedImageCount = computed(() => imageResults.value.filter(i => i.selected).length)
const canAddImages = computed(() => selectedImageCount.value > 0 && !saving.value)

async function searchImages() {
  const query = imageSearchQuery.value.trim()
  if (!query || searchingImages.value) return

  searchingImages.value = true

  try {
    const response = await fetch(`/api/images/search?q=${encodeURIComponent(query)}`)

    if (response.status === 503) {
      imageSearchAvailable.value = false
      return
    }

    if (!response.ok) {
      throw new Error('Search failed')
    }

    const data = await response.json()

    // Transform results and add to list
    const newResults: ImageResult[] = data.images.map((img: {
      title: string
      url: string
      thumbnail: string
      width: number
      height: number
      source: string
    }, index: number) => ({
      id: `img-${Date.now()}-${index}`,
      title: img.title,
      url: img.url,
      thumbnail: img.thumbnail,
      width: img.width,
      height: img.height,
      source: img.source,
      status: 'idle',
      dataUrl: null,
      selected: false
    }))

    imageResults.value = newResults
  } catch (e) {
    console.error('Image search failed:', e)
  }

  searchingImages.value = false
}

function toggleImageSelect(image: ImageResult) {
  if (image.status === 'error') return
  image.selected = !image.selected

  // If selected and no dataUrl yet, fetch it
  if (image.selected && !image.dataUrl && image.status === 'idle') {
    fetchImageData(image)
  }
}

async function fetchImageData(image: ImageResult) {
  image.status = 'loading'

  try {
    const response = await fetch('/api/images/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: image.url, title: image.title })
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }

    image.dataUrl = data.data
    image.status = 'success'
  } catch (e) {
    console.error('Failed to fetch image:', e)
    image.status = 'error'
    image.selected = false
  }
}

function selectAllImages() {
  imageResults.value.forEach(img => {
    if (img.status !== 'error') {
      img.selected = true
      if (!img.dataUrl && img.status === 'idle') {
        fetchImageData(img)
      }
    }
  })
}

function deselectAllImages() {
  imageResults.value.forEach(img => img.selected = false)
}

function removeImage(id: string) {
  imageResults.value = imageResults.value.filter(i => i.id !== id)
}

function clearAllImages() {
  imageResults.value = []
}

async function handleAddImages() {
  const selected = imageResults.value.filter(i => i.selected && i.dataUrl)
  if (selected.length === 0) return

  saving.value = true

  // Wait for any still-loading images
  const stillLoading = selected.filter(i => i.status === 'loading')
  if (stillLoading.length > 0) {
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const loading = selected.filter(i => i.status === 'loading')
        if (loading.length === 0) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 100)
    })
  }

  const images = selected
    .filter(i => i.dataUrl)
    .map(i => ({
      dataUrl: i.dataUrl!,
      brandName: i.title || 'Image'
    }))

  emit('add', images)

  const addedIds = new Set(selected.map(i => i.id))
  imageResults.value = imageResults.value.filter(i => !addedIds.has(i.id))

  saving.value = false
}
</script>

<template>
  <div class="logo-panel">
    <!-- Header -->
    <div class="logo-panel__header">
      <h3 class="logo-panel__title">Assets</h3>
      <AppButton variant="ghost" size="sm" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </AppButton>
    </div>

    <!-- Tabs -->
    <div class="logo-panel__tabs">
      <button
        :class="['logo-panel__tab', { 'logo-panel__tab--active': activeTab === 'images' }]"
        @click="activeTab = 'images'"
      >
        <AppIcon name="image" :size="14" />
        Images
      </button>
      <button
        :class="['logo-panel__tab', { 'logo-panel__tab--active': activeTab === 'generate' }]"
        @click="activeTab = 'generate'"
      >
        <AppIcon name="image" :size="14" />
        Generate
      </button>
    </div>

    <!-- IMAGE SEARCH TAB -->
    <template v-if="activeTab === 'images'">
      <div class="logo-panel__search">
        <input
          v-model="imageSearchQuery"
          class="logo-panel__input logo-panel__input--single"
          placeholder="Search for images..."
          :disabled="searchingImages"
          @keydown.enter="searchImages"
        />
        <AppButton
          size="sm"
          @click="searchImages"
          :disabled="!imageSearchQuery.trim() || searchingImages"
          :loading="searchingImages"
        >
          <AppIcon name="search" :size="14" />
          Search
        </AppButton>
      </div>

      <div class="logo-panel__options">
        <span class="logo-panel__source">
          {{ imageSearchAvailable ? 'Powered by Google' : 'Search unavailable' }}
        </span>
      </div>

      <div class="logo-panel__results">
        <div v-if="imageResults.length > 0" class="logo-panel__selection-bar">
          <span class="logo-panel__count">
            {{ selectedImageCount }} of {{ imageResults.length }} selected
          </span>
          <div class="logo-panel__selection-actions">
            <button @click="selectAllImages">All</button>
            <button @click="deselectAllImages">None</button>
            <button @click="clearAllImages">Clear</button>
          </div>
        </div>

        <div class="logo-panel__grid">
          <div
            v-for="image in imageResults"
            :key="image.id"
            :class="[
              'logo-panel__card',
              { 'logo-panel__card--selected': image.selected },
              { 'logo-panel__card--error': image.status === 'error' },
              { 'logo-panel__card--loading': image.status === 'loading' }
            ]"
            @click="toggleImageSelect(image)"
          >
            <div class="logo-panel__checkbox" v-if="image.status !== 'error'">
              <AppIcon :name="image.selected ? 'check-square' : 'square'" :size="16" />
            </div>

            <button class="logo-panel__remove" @click.stop="removeImage(image.id)">
              <AppIcon name="x" :size="12" />
            </button>

            <div class="logo-panel__preview logo-panel__preview--image">
              <AppSpinner v-if="image.status === 'loading'" size="sm" />
              <img
                v-else
                :src="image.thumbnail"
                :alt="image.title"
              />
              <div v-if="image.status === 'error'" class="logo-panel__error-overlay">
                <AppIcon name="alert-circle" :size="16" />
              </div>
            </div>

            <div class="logo-panel__name" :title="image.title">{{ image.title || 'Untitled' }}</div>
          </div>
        </div>

        <div v-if="imageResults.length === 0" class="logo-panel__empty">
          <AppIcon name="image" :size="32" />
          <p>Search for images above</p>
          <p class="logo-panel__empty-hint">Results from Google Images</p>
        </div>
      </div>

      <div class="logo-panel__footer">
        <AppButton
          :disabled="!canAddImages"
          :loading="saving"
          @click="handleAddImages"
          class="logo-panel__add-btn"
        >
          <AppIcon name="plus" :size="16" />
          Add {{ selectedImageCount > 0 ? selectedImageCount : '' }} Image{{ selectedImageCount !== 1 ? 's' : '' }}
        </AppButton>
      </div>
    </template>

    <!-- ICON GENERATOR TAB -->
    <template v-if="activeTab === 'generate'">
      <div class="logo-panel__search">
        <input
          v-model="iconSubject"
          class="logo-panel__input logo-panel__input--single"
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
    </template>
  </div>
</template>

<style scoped>
.logo-panel {
  width: 320px;
  height: 100%;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.logo-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.logo-panel__tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.logo-panel__tab:hover {
  color: var(--color-text-primary);
  background: var(--bg-primary);
}

.logo-panel__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.logo-panel__search {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.logo-panel__input {
  width: 100%;
  min-height: 36px;
  max-height: 120px;
  padding: var(--space-sm);
  background: var(--bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: inherit;
  resize: none;
  line-height: 1.4;
  overflow-y: auto;
}

.logo-panel__input--single {
  min-height: unset;
  max-height: unset;
  height: 36px;
  resize: none;
  overflow: hidden;
}

.logo-panel__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.logo-panel__input::placeholder {
  color: var(--color-text-muted);
}

.logo-panel__input:disabled {
  opacity: 0.6;
}

.logo-panel__options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-md);
}

.logo-panel__source {
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 var(--space-md);
}

.logo-panel__results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
}

.logo-panel__selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.logo-panel__selection-actions {
  display: flex;
  gap: var(--space-xs);
}

.logo-panel__selection-actions button {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
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
  aspect-ratio: 165 / 112;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.logo-panel__preview img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.logo-panel__error {
  color: var(--color-error);
}

.logo-panel__preview--image {
  background: var(--bg-primary);
}

.logo-panel__preview--image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-panel__error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
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
  font-size: 11px !important;
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
