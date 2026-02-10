<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppCard, AppIcon } from '../atoms'
import { FolderChip } from '../molecules'
import type { Asset, Folder } from '../../types'

interface Props {
  asset: Asset
  folder?: Folder | null
  selected?: boolean
  selectable?: boolean
  showCheckbox?: boolean // true when any asset is selected (forces checkbox visibility)
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  selectable: false,
  showCheckbox: false
})

const emit = defineEmits<{
  click: []
  select: []
  delete: []
  download: [format?: string]
  rename: []
  setAsCover: []
  move: []
}>()

const showMenu = ref(false)
const showFormatMenu = ref(false)

const availableFormats = computed(() => {
  const sourceExt = props.asset.type === 'image/svg+xml' ? 'svg'
    : props.asset.type.split('/')[1] || 'png'
  const formats = [
    { label: 'PNG', value: 'png' },
    { label: 'JPG', value: 'jpg' },
    { label: 'WebP', value: 'webp' },
    { label: 'SVG', value: 'svg' }
  ]
  // Only show SVG option if source is SVG
  const filtered = sourceExt === 'svg' ? formats : formats.filter(f => f.value !== 'svg')
  return filtered.map(f => ({
    ...f,
    label: f.value === sourceExt || (f.value === 'jpg' && sourceExt === 'jpeg')
      ? `${f.label} (Original)` : f.label
  }))
})

const handleFormatDownload = (format: string) => {
  emit('download', format)
  showFormatMenu.value = false
}

const toggleMenu = (event: Event) => {
  event.stopPropagation()
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const handleRename = () => {
  emit('rename')
  closeMenu()
}

const handleDelete = () => {
  emit('delete')
  closeMenu()
}

const handleSetAsCover = () => {
  emit('setAsCover')
  closeMenu()
}

const handleMove = () => {
  emit('move')
  closeMenu()
}

const formattedSize = computed(() => {
  const bytes = props.asset.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const formattedType = computed(() => {
  const subtype = props.asset.type.split('/')[1] || ''
  // Clean up common MIME subtypes
  const typeMap: Record<string, string> = {
    'svg+xml': 'SVG',
    'jpeg': 'JPG',
    'png': 'PNG',
    'gif': 'GIF',
    'webp': 'WEBP'
  }
  return typeMap[subtype.toLowerCase()] || subtype.toUpperCase()
})
</script>

<template>
  <AppCard
    variant="bordered"
    padding="none"
    clickable
    :class="['asset-card', { 'asset-card--selected': selected, 'asset-card--menu-open': showMenu || showFormatMenu }]"
    @click="selectable ? emit('select') : emit('click')"
    @mouseleave="showMenu = false; showFormatMenu = false"
  >
    <!-- Selection checkbox (visible on hover, or always when any item is selected) -->
    <div
      v-if="selectable"
      :class="['asset-card__select', { 'asset-card__select--visible': showCheckbox || selected }]"
    >
      <div :class="['asset-card__checkbox', { 'asset-card__checkbox--checked': selected }]">
        <AppIcon v-if="selected" name="check" :size="14" />
      </div>
    </div>

    <!-- Image preview -->
    <div class="asset-card__preview">
      <img
        :src="`/api/assets/${asset.id}/image`"
        :alt="asset.name"
        class="asset-card__image"
        loading="lazy"
      />
    </div>

    <!-- Info section -->
    <div class="asset-card__info">
      <div v-if="folder" class="asset-card__folder">
        <AppIcon name="folder" :size="12" />
        <span>{{ folder.name }}</span>
      </div>

      <div class="asset-card__name" :title="asset.name">
        {{ asset.name }}
      </div>

      <div class="asset-card__meta">
        <span class="asset-card__type">{{ formattedType }}</span>
        <span class="asset-card__size">{{ formattedSize }}</span>
      </div>
    </div>

    <!-- Hover actions -->
    <div class="asset-card__actions">
      <div class="asset-card__download-group">
        <button class="asset-card__action asset-card__action--download" @click.stop="emit('download')" title="Download (original)">
          <AppIcon name="download" :size="16" />
        </button>
        <button class="asset-card__action asset-card__action--format" @click.stop="showFormatMenu = !showFormatMenu" title="Download as...">
          <AppIcon name="chevron-down" :size="12" />
        </button>
        <div v-if="showFormatMenu" class="asset-card__dropdown asset-card__dropdown--format" @click.stop>
          <button
            v-for="fmt in availableFormats"
            :key="fmt.value"
            class="asset-card__dropdown-item"
            @click="handleFormatDownload(fmt.value)"
          >
            <span>{{ fmt.label }}</span>
          </button>
        </div>
      </div>
      <div class="asset-card__menu-wrapper">
        <button class="asset-card__action asset-card__action--menu" @click="toggleMenu" title="More options">
          <AppIcon name="more-vertical" :size="16" />
        </button>
        <div v-if="showMenu" class="asset-card__dropdown" @click.stop>
          <button class="asset-card__dropdown-item" @click="handleSetAsCover">
            <AppIcon name="image" :size="14" />
            <span>Set as Cover</span>
          </button>
          <button class="asset-card__dropdown-item" @click="handleRename">
            <AppIcon name="edit" :size="14" />
            <span>Rename</span>
          </button>
          <button class="asset-card__dropdown-item" @click="handleMove">
            <AppIcon name="move" :size="14" />
            <span>Move to...</span>
          </button>
          <button class="asset-card__dropdown-item asset-card__dropdown-item--danger" @click="handleDelete">
            <AppIcon name="trash" :size="14" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>

  </AppCard>

  <!-- Teleport backdrop to body so it's truly full-screen -->
  <Teleport to="body">
    <div v-if="showMenu || showFormatMenu" class="asset-card__backdrop" @click="closeMenu(); showFormatMenu = false"></div>
  </Teleport>
</template>

<style scoped>
.asset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all var(--transition-fast);
}

.asset-card--menu-open {
  overflow: visible;
  z-index: 60;
}

.asset-card:hover {
  border-color: var(--color-border-hover);
}

.asset-card--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

/* Selection checkbox */
.asset-card__select {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
  z-index: 10;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.asset-card:hover .asset-card__select,
.asset-card__select--visible {
  opacity: 1;
}

.asset-card__checkbox {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.asset-card__checkbox:hover {
  border-color: var(--color-primary);
}

.asset-card__checkbox--checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* Preview */
.asset-card__preview {
  position: relative;
  aspect-ratio: 1;
  background: var(--color-bg);
  overflow: hidden;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.asset-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);
}

.asset-card:hover .asset-card__image {
  transform: scale(1.05);
}

/* Info */
.asset-card__info {
  padding: var(--space-sm);
}

.asset-card__folder {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.asset-card__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-card__meta {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.asset-card__type {
  padding: 2px 6px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
}

/* Hover actions */
.asset-card__actions {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.asset-card:hover .asset-card__actions {
  opacity: 1;
}

.asset-card__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--bg-secondary, #1a1a1a);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  color: var(--text-secondary, #999);
  cursor: pointer;
  transition: all 0.15s ease;
}

.asset-card__action--download:hover {
  background: var(--accent-color, #4a9eff);
  border-color: var(--accent-color, #4a9eff);
  color: white;
}

.asset-card__action--menu:hover {
  background: var(--color-surface, #2a2a2a);
  border-color: var(--color-border-hover, #444);
}

/* Download group */
.asset-card__download-group {
  display: flex;
  position: relative;
}

.asset-card__action--format {
  width: 20px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}

.asset-card__action--download {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.asset-card__action--format:hover {
  background: var(--accent-color, #4a9eff);
  border-color: var(--accent-color, #4a9eff);
  color: white;
}

.asset-card__dropdown--format {
  left: 0;
  right: auto;
}

/* Menu wrapper */
.asset-card__menu-wrapper {
  position: relative;
}

/* Dropdown menu */
.asset-card__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 140px;
  background: var(--color-surface, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 100;
  animation: dropdownFade 0.15s ease;
}

@keyframes dropdownFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.asset-card__dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--color-text-primary, #fff);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.asset-card__dropdown-item:hover {
  background: var(--color-bg-elevated, #2a2a2a);
}

.asset-card__dropdown-item--danger {
  color: var(--color-error, #ef4444);
}

.asset-card__dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}


</style>

<style>
/* Global - backdrop is teleported to body */
.asset-card__backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}
</style>
