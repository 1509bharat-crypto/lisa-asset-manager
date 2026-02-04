<script setup lang="ts">
import { computed } from 'vue'
import { AppCard, AppIcon, AppButton } from '../atoms'
import type { Project } from '../../types'

interface Props {
  project: Project
  assetCount: number
  folderCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
  delete: []
}>()

// Sanitize color to prevent CSS injection
const safeColor = computed(() => {
  return /^#[0-9a-fA-F]{6}$/.test(props.project.color)
    ? props.project.color
    : '#667eea'
})
</script>

<template>
  <AppCard
    variant="bordered"
    padding="none"
    clickable
    class="project-card"
    :style="{ borderColor: safeColor }"
    @click="emit('click')"
  >
    <div class="project-card__header" :style="{ background: `${safeColor}15` }">
      <div class="project-card__color-badge" :style="{ background: safeColor }"></div>
      <h3 class="project-card__name">{{ project.name }}</h3>
    </div>

    <p class="project-card__description">
      {{ project.description || 'No description' }}
    </p>

    <div class="project-card__stats">
      <div class="project-card__stat">
        <AppIcon name="image" :size="16" />
        <span>{{ assetCount }} assets</span>
      </div>
      <div class="project-card__stat">
        <AppIcon name="folder" :size="16" />
        <span>{{ folderCount }} folders</span>
      </div>
    </div>

    <div class="project-card__actions">
      <AppButton
        variant="ghost"
        size="sm"
        class="project-card__delete"
        @click.stop="emit('delete')"
      >
        <AppIcon name="trash" :size="18" />
      </AppButton>
    </div>
  </AppCard>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-width: 2px;
  border-left-width: 4px;
}

.project-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
}

.project-card__color-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-card__name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card__description {
  padding: 0 var(--space-md);
  margin-bottom: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card__stats {
  display: flex;
  gap: var(--space-lg);
  padding: 0 var(--space-md) var(--space-md);
}

.project-card__stat {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.project-card__actions {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.project-card__delete {
  color: var(--color-text-muted);
}

.project-card__delete:hover {
  color: var(--color-error);
  background: var(--color-error-light);
}
</style>
