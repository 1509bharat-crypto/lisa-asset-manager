<script setup lang="ts">
import { computed } from 'vue'
import { AppCard, AppIcon } from '../atoms'
import { FolderChip } from '../molecules'
import type { Asset, Folder } from '../../types'

interface Props {
  asset: Asset
  folder?: Folder | null
  selected?: boolean
  selectable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  selectable: false
})

const emit = defineEmits<{
  click: []
  select: []
  delete: []
}>()

const formattedSize = computed(() => {
  const bytes = props.asset.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})
</script>

<template>
  <AppCard
    variant="bordered"
    padding="none"
    :clickable="!selectable"
    :class="['asset-card', { 'asset-card--selected': selected }]"
    @click="emit('click')"
  >
    <!-- Selection checkbox -->
    <div v-if="selectable" class="asset-card__select" @click.stop="emit('select')">
      <div :class="['asset-card__checkbox', { 'asset-card__checkbox--checked': selected }]">
        <AppIcon v-if="selected" name="check" :size="14" />
      </div>
    </div>

    <!-- Image preview -->
    <div class="asset-card__preview">
      <img
        :src="asset.data"
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
        <span class="asset-card__type">{{ asset.type.split('/')[1]?.toUpperCase() }}</span>
        <span class="asset-card__size">{{ formattedSize }}</span>
      </div>
    </div>

    <!-- Delete button (hover) -->
    <button class="asset-card__delete" @click.stop="emit('delete')">
      <AppIcon name="trash" :size="16" />
    </button>
  </AppCard>
</template>

<style scoped>
.asset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all var(--transition-fast);
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

/* Delete button */
.asset-card__delete {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
}

.asset-card:hover .asset-card__delete {
  opacity: 1;
}

.asset-card__delete:hover {
  background: var(--color-error-light);
  border-color: var(--color-error);
  color: var(--color-error);
}
</style>
