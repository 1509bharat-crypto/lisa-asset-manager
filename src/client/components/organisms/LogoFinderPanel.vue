<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { AppButton, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  add: [logos: { dataUrl: string; brandName: string }[]]
}>()

// === TAB STATE ===
type Tab = 'logos' | 'generate'
const activeTab = ref<Tab>('logos')

// === LOGO FINDER STATE ===
const FALLBACK_PROVIDERS = [
  (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
  (d: string) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
]

interface BrandSearchResult {
  name: string
  domain: string
  icon?: string
  brandId?: string
}

interface BrandLogo {
  type: string
  theme: string
  formats: { src: string; format: string }[]
}

interface BrandResult {
  name: string
  domain: string
  logoUrl: string | null
  logos: BrandLogo[]
  status: 'loading' | 'success' | 'error'
  fallbackIndex: number
  useBrandfetch: boolean
  selected: boolean
}

const brandInput = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const searchResults = ref<BrandResult[]>([])
const saving = ref(false)
const searching = ref(false)
const brandfetchAvailable = ref(true)
const logoBgColor = ref<'white' | 'transparent'>('white')

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

// Auto-expand textarea
function autoResize() {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }
}

watch(brandInput, () => {
  nextTick(autoResize)
})

// === LOGO FINDER METHODS ===
const selectedCount = computed(() => searchResults.value.filter(r => r.selected).length)
const canAdd = computed(() => selectedCount.value > 0 && !saving.value)

async function searchBrands() {
  const text = brandInput.value.trim()
  if (!text) return

  const names = text.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 0)
  brandInput.value = ''
  searching.value = true

  for (const name of names) {
    if (searchResults.value.find(r => r.name.toLowerCase() === name.toLowerCase())) {
      continue
    }

    const result: BrandResult = {
      name,
      domain: '',
      logoUrl: null,
      logos: [],
      status: 'loading',
      fallbackIndex: 0,
      useBrandfetch: brandfetchAvailable.value,
      selected: false
    }
    searchResults.value.push(result)

    try {
      const searchResponse = await fetch(`/api/logo/search?q=${encodeURIComponent(name)}`)

      if (searchResponse.status === 503) {
        brandfetchAvailable.value = false
        result.useBrandfetch = false
        result.domain = guessDomain(name)
        continue
      }

      if (!searchResponse.ok) {
        throw new Error('Search failed')
      }

      const searchData: BrandSearchResult[] = await searchResponse.json()

      if (searchData.length === 0) {
        result.useBrandfetch = false
        result.domain = guessDomain(name)
        continue
      }

      const firstResult = searchData[0]
      result.domain = firstResult.domain
      result.name = firstResult.name || name

      const brandResponse = await fetch(`/api/logo/brand/${encodeURIComponent(firstResult.domain)}`)

      if (!brandResponse.ok) {
        throw new Error('Brand fetch failed')
      }

      const brandData = await brandResponse.json()
      const logos = brandData.logos || []
      result.logos = logos

      let bestLogo: string | null = null

      for (const logo of logos) {
        if (logo.type === 'logo' && logo.theme === 'light') {
          const pngFormat = logo.formats?.find((f: { format: string }) => f.format === 'png')
          if (pngFormat) {
            bestLogo = pngFormat.src
            break
          }
          const svgFormat = logo.formats?.find((f: { format: string }) => f.format === 'svg')
          if (svgFormat) {
            bestLogo = svgFormat.src
            break
          }
        }
      }

      if (!bestLogo) {
        for (const logo of logos) {
          if (logo.type === 'logo') {
            const pngFormat = logo.formats?.find((f: { format: string }) => f.format === 'png')
            if (pngFormat) {
              bestLogo = pngFormat.src
              break
            }
          }
        }
      }

      if (!bestLogo) {
        for (const logo of logos) {
          if (logo.type === 'icon') {
            const pngFormat = logo.formats?.find((f: { format: string }) => f.format === 'png')
            if (pngFormat) {
              bestLogo = pngFormat.src
              break
            }
          }
        }
      }

      if (!bestLogo && logos.length > 0) {
        const firstLogo = logos[0]
        if (firstLogo.formats?.length > 0) {
          bestLogo = firstLogo.formats[0].src
        }
      }

      if (bestLogo) {
        result.logoUrl = bestLogo
        result.status = 'success'
      } else {
        result.useBrandfetch = false
      }

    } catch (e) {
      console.error('Brandfetch search failed for', name, e)
      result.useBrandfetch = false
      result.domain = guessDomain(name)
    }
  }

  searching.value = false
}

function guessDomain(name: string): string {
  const lower = name.toLowerCase().trim()
  const cleaned = lower.replace(/[^a-z0-9]/g, '').trim()
  return cleaned ? `${cleaned}.com` : ''
}

function handleImageLoad(result: BrandResult) {
  result.status = 'success'
}

function handleImageError(result: BrandResult) {
  if (result.useBrandfetch) {
    result.useBrandfetch = false
    result.logoUrl = null
    result.fallbackIndex = 0
    return
  }

  result.fallbackIndex++
  if (result.fallbackIndex < FALLBACK_PROVIDERS.length) {
    result.logoUrl = FALLBACK_PROVIDERS[result.fallbackIndex](result.domain)
  } else {
    result.status = 'error'
    result.logoUrl = null
  }
}

function getLogoUrl(result: BrandResult): string {
  if (!result.domain && !result.logoUrl) return ''
  if (result.logoUrl) return result.logoUrl

  if (!result.useBrandfetch && result.domain) {
    result.logoUrl = FALLBACK_PROVIDERS[result.fallbackIndex](result.domain)
    return result.logoUrl
  }

  return ''
}

function toggleSelect(result: BrandResult) {
  if (result.status === 'success') {
    result.selected = !result.selected
  }
}

function selectAll() {
  searchResults.value.forEach(r => {
    if (r.status === 'success') r.selected = true
  })
}

function deselectAll() {
  searchResults.value.forEach(r => r.selected = false)
}

function removeBrand(name: string) {
  searchResults.value = searchResults.value.filter(r => r.name !== name)
}

function clearAll() {
  searchResults.value = []
}

async function handleAddLogos() {
  const selected = searchResults.value.filter(r => r.selected && r.logoUrl)
  if (selected.length === 0) return

  saving.value = true
  const processedLogos: { dataUrl: string; brandName: string }[] = []

  for (const brand of selected) {
    try {
      const response = await fetch('/api/logo/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: brand.logoUrl,
          name: brand.name
        })
      })

      const data = await response.json()
      if (!data.error && data.data) {
        processedLogos.push({
          dataUrl: data.data,
          brandName: brand.name
        })
      }
    } catch (e) {
      console.error('Failed to process logo for', brand.name, e)
    }
  }

  if (processedLogos.length > 0) {
    emit('add', processedLogos)
    const addedNames = new Set(processedLogos.map(l => l.brandName))
    searchResults.value = searchResults.value.filter(r => !addedNames.has(r.name))
  }

  saving.value = false
}

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
      <h3 class="logo-panel__title">Assets</h3>
      <AppButton variant="ghost" size="sm" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </AppButton>
    </div>

    <!-- Tabs -->
    <div class="logo-panel__tabs">
      <button
        :class="['logo-panel__tab', { 'logo-panel__tab--active': activeTab === 'logos' }]"
        @click="activeTab = 'logos'"
      >
        <AppIcon name="search" :size="14" />
        Find Logos
      </button>
      <button
        :class="['logo-panel__tab', { 'logo-panel__tab--active': activeTab === 'generate' }]"
        @click="activeTab = 'generate'"
      >
        <AppIcon name="image" :size="14" />
        Generate
      </button>
    </div>

    <!-- LOGO FINDER TAB -->
    <template v-if="activeTab === 'logos'">
      <div class="logo-panel__search">
        <textarea
          ref="textareaRef"
          v-model="brandInput"
          class="logo-panel__input"
          placeholder="Brand names (comma or newline)&#10;e.g., Nike, Adidas, Puma"
          rows="4"
          :disabled="searching"
          @keydown.meta.enter="searchBrands"
          @keydown.ctrl.enter="searchBrands"
          @input="autoResize"
        />
        <AppButton
          size="sm"
          @click="searchBrands"
          :disabled="!brandInput.trim() || searching"
          :loading="searching"
        >
          <AppIcon name="search" :size="14" />
          Search
        </AppButton>
      </div>

      <div class="logo-panel__options">
        <span class="logo-panel__source">
          {{ brandfetchAvailable ? 'Powered by Brandfetch' : 'Using favicons' }}
        </span>
        <div class="logo-panel__bg-toggle">
          <button
            :class="['logo-panel__bg-btn', { 'logo-panel__bg-btn--active': logoBgColor === 'white' }]"
            @click="logoBgColor = 'white'"
            title="White background"
          >
            <span class="logo-panel__bg-swatch logo-panel__bg-swatch--white"></span>
          </button>
          <button
            :class="['logo-panel__bg-btn', { 'logo-panel__bg-btn--active': logoBgColor === 'transparent' }]"
            @click="logoBgColor = 'transparent'"
            title="Transparent background"
          >
            <span class="logo-panel__bg-swatch logo-panel__bg-swatch--transparent"></span>
          </button>
        </div>
      </div>

      <div class="logo-panel__results">
        <div v-if="searchResults.length > 0" class="logo-panel__selection-bar">
          <span class="logo-panel__count">
            {{ selectedCount }} of {{ searchResults.length }} selected
          </span>
          <div class="logo-panel__selection-actions">
            <button @click="selectAll">All</button>
            <button @click="deselectAll">None</button>
            <button @click="clearAll">Clear</button>
          </div>
        </div>

        <div class="logo-panel__grid">
          <div
            v-for="result in searchResults"
            :key="result.name"
            :class="[
              'logo-panel__card',
              { 'logo-panel__card--selected': result.selected },
              { 'logo-panel__card--error': result.status === 'error' },
              { 'logo-panel__card--loading': result.status === 'loading' }
            ]"
            @click="toggleSelect(result)"
          >
            <div class="logo-panel__checkbox" v-if="result.status === 'success'">
              <AppIcon :name="result.selected ? 'check-square' : 'square'" :size="16" />
            </div>

            <button class="logo-panel__remove" @click.stop="removeBrand(result.name)">
              <AppIcon name="x" :size="12" />
            </button>

            <div
              :class="[
                'logo-panel__preview',
                { 'logo-panel__preview--transparent': logoBgColor === 'transparent' }
              ]"
            >
              <AppSpinner v-if="result.status === 'loading' && !getLogoUrl(result)" size="sm" />
              <img
                v-else-if="getLogoUrl(result)"
                :src="getLogoUrl(result)"
                :alt="result.name"
                @load="handleImageLoad(result)"
                @error="handleImageError(result)"
              />
              <div v-if="result.status === 'error'" class="logo-panel__error">
                <AppIcon name="alert-circle" :size="20" />
              </div>
            </div>

            <div class="logo-panel__name">{{ result.name }}</div>
          </div>
        </div>

        <div v-if="searchResults.length === 0" class="logo-panel__empty">
          <AppIcon name="search" :size="32" />
          <p>Search for brand names above</p>
        </div>
      </div>

      <div class="logo-panel__footer">
        <AppButton
          :disabled="!canAdd"
          :loading="saving"
          @click="handleAddLogos"
          class="logo-panel__add-btn"
        >
          <AppIcon name="plus" :size="16" />
          Add {{ selectedCount > 0 ? selectedCount : '' }} Logo{{ selectedCount !== 1 ? 's' : '' }}
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
}

.logo-panel__bg-toggle {
  display: flex;
  gap: 4px;
}

.logo-panel__bg-btn {
  background: none;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.logo-panel__bg-btn:hover {
  border-color: var(--color-text-muted);
}

.logo-panel__bg-btn--active {
  border-color: var(--color-primary);
}

.logo-panel__bg-swatch {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.logo-panel__bg-swatch--white {
  background: #fff;
  border: 1px solid var(--color-border);
}

.logo-panel__bg-swatch--transparent {
  background:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
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
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.logo-panel__preview--transparent {
  background:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

.logo-panel__preview img {
  width: 70%;
  height: 70%;
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
