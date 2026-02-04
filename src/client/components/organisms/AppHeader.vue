<script setup lang="ts">
import { AppButton, AppIcon } from '../atoms'
import { SearchBar } from '../molecules'

defineProps<{
  projectName?: string
  showBack?: boolean
  searchQuery?: string
}>()

const emit = defineEmits<{
  back: []
  search: [query: string]
  upload: []
  createProject: []
  createFolder: []
}>()
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <AppButton
        v-if="showBack"
        variant="ghost"
        size="sm"
        @click="emit('back')"
        class="app-header__back"
      >
        <AppIcon name="back" :size="20" />
        Back
      </AppButton>

      <h1 class="app-header__title">
        {{ projectName || 'Asset Library' }}
      </h1>
    </div>

    <div class="app-header__center">
      <SearchBar
        :model-value="searchQuery || ''"
        placeholder="Search assets..."
        @update:model-value="emit('search', $event)"
      />
    </div>

    <div class="app-header__right">
      <slot name="actions">
        <AppButton
          v-if="projectName"
          variant="secondary"
          size="sm"
          @click="emit('createFolder')"
        >
          <AppIcon name="folder" :size="16" />
          New Folder
        </AppButton>

        <AppButton
          v-if="projectName"
          size="sm"
          @click="emit('upload')"
        >
          <AppIcon name="upload" :size="16" />
          Upload
        </AppButton>

        <AppButton
          v-if="!projectName"
          @click="emit('createProject')"
        >
          <AppIcon name="plus" :size="16" />
          New Project
        </AppButton>
      </slot>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 200px;
}

.app-header__back {
  margin-right: var(--space-sm);
}

.app-header__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__center {
  flex: 1;
  max-width: 500px;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-left: auto;
}

@media (max-width: 768px) {
  .app-header {
    flex-wrap: wrap;
    padding: var(--space-md);
  }

  .app-header__left {
    order: 1;
    min-width: auto;
  }

  .app-header__center {
    order: 3;
    flex-basis: 100%;
    max-width: none;
    margin-top: var(--space-md);
  }

  .app-header__right {
    order: 2;
  }
}
</style>
