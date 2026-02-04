<script setup lang="ts">
import { AppIcon } from '../atoms'

interface Props {
  name: string
  active?: boolean
  hasChildren?: boolean
  deletable?: boolean
  isBack?: boolean
  isHome?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  hasChildren: false,
  deletable: true,
  isBack: false,
  isHome: false
})

const emit = defineEmits<{
  click: []
  delete: []
  dblclick: []
}>()
</script>

<template>
  <button
    :class="['folder-chip', { 'folder-chip--active': active }]"
    @click="emit('click')"
    @dblclick="emit('dblclick')"
  >
    <AppIcon v-if="isBack" name="back" :size="14" />
    <AppIcon v-else-if="isHome" name="home" :size="14" />
    <AppIcon v-else name="folder" :size="14" />

    <span class="folder-chip__name">{{ name }}</span>

    <AppIcon v-if="hasChildren" name="chevron-right" :size="14" class="folder-chip__arrow" />

    <span
      v-if="deletable && !isBack && !isHome"
      class="folder-chip__delete"
      @click.stop="emit('delete')"
    >
      &times;
    </span>
  </button>
</template>

<style scoped>
.folder-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.folder-chip:hover {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-hover);
}

.folder-chip--active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.folder-chip__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-chip__arrow {
  color: var(--color-text-muted);
}

.folder-chip__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: var(--space-xs);
  font-size: 14px;
  color: var(--color-text-muted);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.folder-chip__delete:hover {
  background: var(--color-error-light);
  color: var(--color-error);
}
</style>
