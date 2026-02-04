<script setup lang="ts">
import { computed } from 'vue'
import { AppButton, AppIcon } from '../atoms'
import { FolderChip } from '../molecules'
import type { Folder } from '../../types'

interface Props {
  folders: Folder[]
  selectedId: string | null
  currentParentId: string | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
  currentParentId: null
})

const emit = defineEmits<{
  select: [id: string | null]
  navigate: [id: string | null]
  create: []
  delete: [id: string]
}>()

// Get folders at current level
const currentLevelFolders = computed(() => {
  return props.folders.filter(f => f.parent_id === props.currentParentId)
})

// Get current folder (for breadcrumb)
const currentFolder = computed(() => {
  if (!props.currentParentId) return null
  return props.folders.find(f => f.id === props.currentParentId) || null
})

// Check if folder has subfolders
const hasSubfolders = (folderId: string): boolean => {
  return props.folders.some(f => f.parent_id === folderId)
}
</script>

<template>
  <div class="folder-tree">
    <div class="folder-tree__chips">
      <!-- Back button (when inside a folder) -->
      <FolderChip
        v-if="currentParentId"
        name="Back"
        :deletable="false"
        :is-back="true"
        @click="emit('navigate', currentFolder?.parent_id || null)"
      />

      <!-- Current folder indicator -->
      <div v-if="currentFolder" class="folder-tree__breadcrumb">
        <AppIcon name="folder" :size="14" />
        <span>{{ currentFolder.name }}</span>
      </div>

      <!-- Home / All (when at root) -->
      <FolderChip
        v-if="!currentParentId"
        name="All"
        :active="selectedId === null"
        :deletable="false"
        :is-home="true"
        @click="emit('select', null)"
      />

      <!-- Folder chips -->
      <FolderChip
        v-for="folder in currentLevelFolders"
        :key="folder.id"
        :name="folder.name"
        :active="selectedId === folder.id"
        :has-children="hasSubfolders(folder.id)"
        @click="emit('select', folder.id)"
        @dblclick="emit('navigate', folder.id)"
        @delete="emit('delete', folder.id)"
      />

      <!-- Add folder button -->
      <AppButton variant="ghost" size="sm" class="folder-tree__add" @click="emit('create')">
        <AppIcon name="plus" :size="14" />
        <span>New Folder</span>
      </AppButton>
    </div>

    <p v-if="currentLevelFolders.length === 0 && !currentParentId" class="folder-tree__hint">
      No folders yet. Click "New Folder" to create one.
    </p>
  </div>
</template>

<style scoped>
.folder-tree {
  margin-bottom: var(--space-md);
}

.folder-tree__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.folder-tree__breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.folder-tree__add {
  gap: var(--space-xs);
}

.folder-tree__hint {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
