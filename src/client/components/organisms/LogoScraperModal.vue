<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, AppCard, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  save: [logoUrl: string, brandName: string]
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
}

const brandInput = ref('')
const searchResults = ref<BrandResult[]>([])
const selectedBrand = ref<string | null>(null)
const saving = ref(false)
const searching = ref(false)
const brandfetchAvailable = ref(true)

const canSave = computed(() => {
  if (!selectedBrand.value) return false
  const brand = searchResults.value.find(b => b.name === selectedBrand.value)
  return brand?.status === 'success' && brand?.logoUrl !== null
})

async function searchBrands() {
  const text = brandInput.value.trim()
  if (!text) return

  const names = text.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 0)
  brandInput.value = ''
  searching.value = true

  for (const name of names) {
    // Add placeholder result
    const result: BrandResult = {
      name,
      domain: '',
      logoUrl: null,
      logos: [],
      status: 'loading',
      fallbackIndex: 0,
      useBrandfetch: brandfetchAvailable.value
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

function selectBrand(name: string) {
  const result = searchResults.value.find(r => r.name === name)
  if (result?.status === 'success') {
    selectedBrand.value = selectedBrand.value === name ? null : name
  }
}

function removeBrand(name: string) {
  searchResults.value = searchResults.value.filter(r => r.name !== name)
  if (selectedBrand.value === name) {
    selectedBrand.value = null
  }
}

async function handleSave() {
  if (!selectedBrand.value) return
  const brand = searchResults.value.find(b => b.name === selectedBrand.value)
  if (!brand?.logoUrl) return

  saving.value = true

  try {
    // Call server endpoint to fetch and process the logo (adds white bg, resizes to 165x112)
    const response = await fetch('/api/logo/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: brand.logoUrl,
        name: brand.name
      })
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }

    // data.data contains the processed image as base64 data URL
    emit('save', data.data, brand.name)
  } catch (e) {
    console.error('Failed to process logo:', e)
    // Fallback: just save the original URL
    emit('save', brand.logoUrl, brand.name)
  } finally {
    saving.value = false
  }
}

function clearAll() {
  searchResults.value = []
  selectedBrand.value = null
}
</script>

<template>
  <Teleport to="body">
    <div class="logo-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="logo-modal">
        <div class="logo-modal__header">
          <h2 class="logo-modal__title">Brand Logo Finder</h2>
          <AppButton variant="ghost" size="sm" @click="emit('close')">
            <AppIcon name="x" :size="20" />
          </AppButton>
        </div>

        <p class="logo-modal__subtitle">
          Search for brand logos{{ brandfetchAvailable ? ' via Brandfetch' : '' }}.
          Selected logo will be processed to 165x112px with white background.
        </p>

        <!-- Search input -->
        <div class="logo-modal__search">
          <textarea
            v-model="brandInput"
            class="logo-modal__input"
            placeholder="Enter brand names (one per line, or comma-separated)&#10;e.g., Nike, Adidas, Puma"
            rows="3"
            :disabled="searching"
            @keydown.meta.enter="searchBrands"
          />
          <AppButton @click="searchBrands" :disabled="!brandInput.trim() || searching" :loading="searching">
            Search
          </AppButton>
        </div>

        <!-- Results grid -->
        <div v-if="searchResults.length > 0" class="logo-modal__results">
          <div class="logo-modal__results-header">
            <span class="logo-modal__count">{{ searchResults.length }} brand(s)</span>
            <AppButton variant="ghost" size="sm" @click="clearAll">
              Clear all
            </AppButton>
          </div>

          <div class="logo-modal__grid">
            <div
              v-for="result in searchResults"
              :key="result.name"
              :class="[
                'logo-modal__card',
                { 'logo-modal__card--selected': selectedBrand === result.name },
                { 'logo-modal__card--error': result.status === 'error' }
              ]"
              @click="selectBrand(result.name)"
            >
              <button class="logo-modal__remove" @click.stop="removeBrand(result.name)">
                <AppIcon name="x" :size="14" />
              </button>

              <div class="logo-modal__preview">
                <AppSpinner v-if="result.status === 'loading' && !getLogoUrl(result)" size="sm" />
                <img
                  v-else-if="getLogoUrl(result)"
                  :src="getLogoUrl(result)"
                  :alt="result.name"
                  @load="handleImageLoad(result)"
                  @error="handleImageError(result)"
                />
                <div v-if="result.status === 'error'" class="logo-modal__error">?</div>
              </div>

              <div class="logo-modal__brand-name">{{ result.name }}</div>
              <div class="logo-modal__domain">{{ result.domain }}</div>
              <div v-if="result.useBrandfetch && result.status === 'success'" class="logo-modal__source">
                via Brandfetch
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="logo-modal__empty">
          <AppIcon name="image" :size="48" class="logo-modal__empty-icon" />
          <p>Enter brand names above to search for logos</p>
          <p class="logo-modal__empty-hint">
            {{ brandfetchAvailable ? 'Powered by Brandfetch API' : 'Using Google & DuckDuckGo favicons' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="logo-modal__actions">
          <AppButton variant="secondary" @click="emit('close')">
            Cancel
          </AppButton>
          <AppButton
            :disabled="!canSave"
            :loading="saving"
            @click="handleSave"
          >
            Add to Project
          </AppButton>
        </div>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.logo-modal__overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
  animation: fadeIn var(--transition-fast);
}

.logo-modal {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp var(--transition-normal);
}

.logo-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.logo-modal__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.logo-modal__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-lg);
}

.logo-modal__search {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.logo-modal__input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface, #1a1a1a);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
}

.logo-modal__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.logo-modal__input::placeholder {
  color: var(--color-text-muted);
}

.logo-modal__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logo-modal__results {
  margin-bottom: var(--space-lg);
}

.logo-modal__results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.logo-modal__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.logo-modal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-md);
}

.logo-modal__card {
  position: relative;
  background: var(--color-surface, #1a1a1a);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.logo-modal__card:hover {
  border-color: var(--color-text-muted);
}

.logo-modal__card--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.logo-modal__card--error {
  cursor: not-allowed;
  opacity: 0.6;
}

.logo-modal__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.logo-modal__card:hover .logo-modal__remove {
  opacity: 1;
}

.logo-modal__remove:hover {
  color: var(--color-error);
}

.logo-modal__preview {
  width: 100%;
  aspect-ratio: 165 / 112;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.logo-modal__preview img {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
}

.logo-modal__error {
  font-size: 24px;
  color: var(--color-error);
}

.logo-modal__brand-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.logo-modal__domain {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-family: monospace;
}

.logo-modal__source {
  font-size: 10px;
  color: var(--color-primary);
  opacity: 0.7;
}

.logo-modal__empty {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  color: var(--color-text-muted);
}

.logo-modal__empty-icon {
  margin-bottom: var(--space-md);
  opacity: 0.4;
}

.logo-modal__empty-hint {
  font-size: var(--font-size-sm);
  margin-top: var(--space-sm);
}

.logo-modal__actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
