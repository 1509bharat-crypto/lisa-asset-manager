<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { AppButton, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  add: [logos: { dataUrl: string; brandName: string }[]]
}>()

// Fallback providers when Brandfetch isn't available
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

const selectedCount = computed(() => searchResults.value.filter(r => r.selected).length)
const canAdd = computed(() => selectedCount.value > 0 && !saving.value)

async function searchBrands() {
  const text = brandInput.value.trim()
  if (!text) return

  const names = text.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 0)
  brandInput.value = ''
  searching.value = true

  for (const name of names) {
    // Check if already in results
    if (searchResults.value.find(r => r.name.toLowerCase() === name.toLowerCase())) {
      continue
    }

    // Add placeholder result
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
      // Try Brandfetch search first
      const searchResponse = await fetch(`/api/logo/search?q=${encodeURIComponent(name)}`)

      if (searchResponse.status === 503) {
        // Brandfetch not configured, use fallback
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
        // No results, try fallback with guessed domain
        result.useBrandfetch = false
        result.domain = guessDomain(name)
        continue
      }

      // Use first result
      const firstResult = searchData[0]
      result.domain = firstResult.domain
      result.name = firstResult.name || name

      // Fetch brand details for logos
      const brandResponse = await fetch(`/api/logo/brand/${encodeURIComponent(firstResult.domain)}`)

      if (!brandResponse.ok) {
        throw new Error('Brand fetch failed')
      }

      const brandData = await brandResponse.json()

      // Extract logos - prefer logo type, then icon, in light theme, PNG format
      const logos = brandData.logos || []
      result.logos = logos

      // Find best logo: prefer 'logo' type with 'light' theme
      let bestLogo: string | null = null

      // First try: logo type, light theme, PNG
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

      // Second try: any logo type, PNG
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

      // Third try: icon type
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

      // Last resort: any format from any logo
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
        // Fall back to non-Brandfetch
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
    // Brandfetch logo failed, try fallback
    result.useBrandfetch = false
    result.logoUrl = null
    result.fallbackIndex = 0
    return
  }

  // Try next fallback provider
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

  // Use fallback provider
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

async function handleAdd() {
  const selected = searchResults.value.filter(r => r.selected && r.logoUrl)
  if (selected.length === 0) return

  saving.value = true
  const processedLogos: { dataUrl: string; brandName: string }[] = []

  for (const brand of selected) {
    try {
      // Call server endpoint to fetch and process the logo
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
    // Remove added logos from results
    const addedNames = new Set(processedLogos.map(l => l.brandName))
    searchResults.value = searchResults.value.filter(r => !addedNames.has(r.name))
  }

  saving.value = false
}
</script>

<template>
  <div class="logo-panel">
    <!-- Header -->
    <div class="logo-panel__header">
      <h3 class="logo-panel__title">Find Logos</h3>
      <AppButton variant="ghost" size="sm" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </AppButton>
    </div>

    <!-- Search input -->
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

    <!-- Source indicator -->
    <div class="logo-panel__source">
      {{ brandfetchAvailable ? 'Powered by Brandfetch' : 'Using favicons' }}
    </div>

    <!-- Results -->
    <div class="logo-panel__results">
      <!-- Selection bar -->
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

      <!-- Logo grid -->
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
          <!-- Checkbox -->
          <div class="logo-panel__checkbox" v-if="result.status === 'success'">
            <AppIcon :name="result.selected ? 'check-square' : 'square'" :size="16" />
          </div>

          <!-- Remove button -->
          <button class="logo-panel__remove" @click.stop="removeBrand(result.name)">
            <AppIcon name="x" :size="12" />
          </button>

          <!-- Logo preview -->
          <div class="logo-panel__preview">
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

          <!-- Brand name -->
          <div class="logo-panel__name">{{ result.name }}</div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="searchResults.length === 0" class="logo-panel__empty">
        <AppIcon name="search" :size="32" />
        <p>Search for brand names above</p>
      </div>
    </div>

    <!-- Footer with add button -->
    <div class="logo-panel__footer">
      <AppButton
        :disabled="!canAdd"
        :loading="saving"
        @click="handleAdd"
        class="logo-panel__add-btn"
      >
        <AppIcon name="plus" :size="16" />
        Add {{ selectedCount > 0 ? selectedCount : '' }} Logo{{ selectedCount !== 1 ? 's' : '' }}
      </AppButton>
    </div>
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

.logo-panel__source {
  padding: 0 var(--space-md);
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  max-width: 80%;
  max-height: 80%;
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

.logo-panel__footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.logo-panel__add-btn {
  width: 100%;
}
</style>
