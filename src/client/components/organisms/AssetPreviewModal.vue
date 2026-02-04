<script setup lang="ts">
import { computed } from 'vue'
import { AppButton, AppCard, AppIcon, AppBadge } from '../atoms'
import type { Asset } from '../../types'

const props = defineProps<{
  asset: Asset
}>()

const emit = defineEmits<{
  close: []
  delete: [id: string]
  download: [asset: Asset]
}>()

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fileExtension = computed(() => {
  const parts = props.asset.name.split('.')
  return parts.length > 1 ? parts.pop()?.toUpperCase() : 'FILE'
})
</script>

<template>
  <Teleport to="body">
    <div class="asset-preview__overlay" @click.self="emit('close')">
      <div class="asset-preview">
        <button class="asset-preview__close" @click="emit('close')">
          <AppIcon name="x" :size="24" />
        </button>

        <div class="asset-preview__image-container">
          <img
            :src="asset.data"
            :alt="asset.name"
            class="asset-preview__image"
          />
        </div>

        <AppCard variant="elevated" padding="lg" class="asset-preview__info">
          <h2 class="asset-preview__filename">{{ asset.name }}</h2>

          <div class="asset-preview__meta">
            <div class="asset-preview__meta-item">
              <span class="asset-preview__meta-label">Type</span>
              <AppBadge>{{ fileExtension }}</AppBadge>
            </div>

            <div class="asset-preview__meta-item">
              <span class="asset-preview__meta-label">Size</span>
              <span class="asset-preview__meta-value">{{ formatFileSize(asset.size) }}</span>
            </div>

            <div class="asset-preview__meta-item">
              <span class="asset-preview__meta-label">Uploaded</span>
              <span class="asset-preview__meta-value">{{ formatDate(asset.upload_date || asset.created_at) }}</span>
            </div>
          </div>

          <div class="asset-preview__actions">
            <AppButton variant="secondary" @click="emit('download', asset)">
              <AppIcon name="download" :size="16" />
              Download
            </AppButton>
            <AppButton variant="danger" @click="emit('delete', asset.id)">
              <AppIcon name="trash" :size="16" />
              Delete
            </AppButton>
          </div>
        </AppCard>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.asset-preview__overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  z-index: var(--z-modal);
  animation: fadeIn var(--transition-fast);
  padding: var(--space-xl);
}

.asset-preview {
  display: flex;
  gap: var(--space-xl);
  max-width: 1200px;
  max-height: 90vh;
  width: 100%;
}

.asset-preview__close {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.asset-preview__close:hover {
  background: var(--color-border);
}

.asset-preview__image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.asset-preview__image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
}

.asset-preview__info {
  width: 320px;
  flex-shrink: 0;
  align-self: flex-start;
  animation: slideIn var(--transition-normal);
}

.asset-preview__filename {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-lg);
  word-break: break-word;
}

.asset-preview__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.asset-preview__meta-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md);
}

.asset-preview__meta-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.asset-preview__meta-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  text-align: right;
}

.asset-preview__folders {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: flex-end;
}

.asset-preview__actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.asset-preview__actions .app-button {
  flex: 1;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .asset-preview {
    flex-direction: column;
  }

  .asset-preview__info {
    width: 100%;
  }
}
</style>
