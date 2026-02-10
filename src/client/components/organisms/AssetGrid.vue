<script setup lang="ts">
import { computed } from 'vue'
import { AppSpinner } from '../atoms'
import AssetCard from './AssetCard.vue'
import type { Asset, Folder } from '../../types'

interface Props {
  assets: Asset[]
  folders?: Folder[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: string[]
  gridSize?: number // Controls min size of cards (smaller = more per row)
}

const props = withDefaults(defineProps<Props>(), {
  folders: () => [],
  loading: false,
  selectable: false,
  selectedIds: () => [],
  gridSize: 200 // Default card min-width in pixels
})

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  download: [asset: Asset, format?: string]
  preview: [asset: Asset]
  rename: [asset: Asset]
  setAsCover: [asset: Asset]
  move: [asset: Asset]
}>()

const getFolder = (folderId: string | null): Folder | null => {
  if (!folderId) return null
  return props.folders.find(f => f.id === folderId) || null
}

const isSelected = (id: string): boolean => {
  return props.selectedIds.includes(id)
}

const hasSelection = computed(() => props.selectedIds.length > 0)

const gridStyle = computed(() => ({
  '--grid-min-size': `${props.gridSize}px`
}))
</script>

<template>
  <div class="asset-grid">
    <!-- Loading state -->
    <div v-if="loading" class="asset-grid__loading">
      <AppSpinner size="lg" />
      <p>Loading assets...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="assets.length === 0" class="asset-grid__empty">
      <div class="asset-grid__empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
      <p class="asset-grid__empty-title">No assets yet</p>
      <p class="asset-grid__empty-text">Upload images to get started</p>
    </div>

    <!-- Asset grid -->
    <div v-else class="asset-grid__grid" :style="gridStyle">
      <AssetCard
        v-for="asset in assets"
        :key="asset.id"
        :asset="asset"
        :folder="getFolder(asset.folder_id)"
        :selectable="selectable"
        :selected="isSelected(asset.id)"
        :show-checkbox="hasSelection"
        @click="emit('preview', asset)"
        @select="emit('select', asset.id)"
        @delete="emit('delete', asset.id)"
        @download="(format?: string) => emit('download', asset, format)"
        @rename="emit('rename', asset)"
        @set-as-cover="emit('setAsCover', asset)"
        @move="emit('move', asset)"
      />
    </div>
  </div>
</template>

<style scoped>
.asset-grid {
  min-height: 200px;
}

.asset-grid__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  color: var(--color-text-muted);
}

.asset-grid__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  text-align: center;
}

.asset-grid__empty-icon {
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
  opacity: 0.5;
}

.asset-grid__empty-title {
  margin-bottom: var(--space-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.asset-grid__empty-text {
  color: var(--color-text-muted);
}

.asset-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-min-size, 200px), 1fr));
  gap: var(--space-md);
}
</style>
