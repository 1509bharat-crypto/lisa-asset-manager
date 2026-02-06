<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppButton, AppIcon } from '../atoms'

const router = useRouter()

defineProps<{
  projectName?: string
  showBack?: boolean
}>()

const emit = defineEmits<{
  back: []
  upload: []
  createProject: []
}>()
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <!-- Logo/Home link - always visible, clickable when in project -->
      <a
        :class="['app-header__logo', { 'app-header__logo--clickable': projectName }]"
        @click="projectName && emit('back')"
      >
        <img src="/symbol.svg" alt="Logo" class="app-header__symbol" />
        <span class="app-header__brand">Asset Library</span>
      </a>

      <!-- Breadcrumb separator and project name -->
      <template v-if="projectName">
        <AppIcon name="chevron-right" :size="16" class="app-header__separator" />
        <h1 class="app-header__title">{{ projectName }}</h1>
      </template>
    </div>

    <div class="app-header__right">
      <slot name="actions">
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

        <AppButton
          v-if="!projectName"
          variant="ghost"
          size="sm"
          @click="router.push('/analytics')"
        >
          <AppIcon name="chart" :size="16" />
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
  gap: var(--space-sm);
  min-width: 200px;
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  text-decoration: none;
  color: var(--color-text-primary);
  transition: opacity var(--transition-fast);
}

.app-header__logo--clickable {
  cursor: pointer;
}

.app-header__logo--clickable:hover {
  opacity: 0.7;
}

.app-header__symbol {
  width: 28px;
  height: 28px;
}

.app-header__brand {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.app-header__separator {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.app-header__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

  .app-header__brand {
    display: none;
  }

  .app-header__right {
    order: 2;
  }
}
</style>
