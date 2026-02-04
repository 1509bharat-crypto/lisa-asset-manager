<script setup lang="ts">
import { ref } from 'vue'
import { AppIcon } from '../atoms'
import type { Folder } from '../../types'

interface FolderWithCount extends Folder {
  assetCount?: number
}

interface Props {
  folders: FolderWithCount[]
  selected: string | null
  totalAssets: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: null,
  loading: false
})

const emit = defineEmits<{
  select: [id: string | null]
  delete: [id: string]
  rename: [folder: Folder]
  create: []
}>()

const openMenuId = ref<string | null>(null)

const handleFolderClick = (id: string | null) => {
  emit('select', id)
}

const toggleMenu = (e: Event, id: string) => {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === id ? null : id
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleRename = (folder: Folder) => {
  emit('rename', folder)
  closeMenu()
}

const handleDelete = (id: string) => {
  emit('delete', id)
  closeMenu()
}
</script>

<template>
  <aside class="folder-sidebar">
    <!-- Header -->
    <div class="folder-sidebar__header">
      <span class="folder-sidebar__title">Folders</span>
      <span class="folder-sidebar__count">{{ folders.length }}</span>
    </div>

    <!-- Folder List -->
    <div class="folder-sidebar__list">
      <!-- All Assets -->
      <button
        class="folder-sidebar__item folder-sidebar__item--all"
        :class="{ 'folder-sidebar__item--active': selected === null }"
        @click="handleFolderClick(null)"
      >
        <div class="folder-sidebar__item-left">
          <AppIcon name="home" :size="16" />
          <span>All Assets</span>
        </div>
        <span class="folder-sidebar__item-count">{{ totalAssets }}</span>
      </button>

      <!-- Divider -->
      <div class="folder-sidebar__divider"></div>

      <!-- Loading State -->
      <div v-if="loading" class="folder-sidebar__loading">
        <div class="folder-sidebar__skeleton" v-for="i in 5" :key="i"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="folders.length === 0" class="folder-sidebar__empty">
        No folders yet
      </div>

      <!-- Folder Items -->
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-sidebar__item-wrapper"
      >
        <button
          class="folder-sidebar__item"
          :class="{ 'folder-sidebar__item--active': selected === folder.id }"
          @click="handleFolderClick(folder.id)"
        >
          <div class="folder-sidebar__item-left">
            <AppIcon name="folder" :size="16" />
            <span class="folder-sidebar__item-name">{{ folder.name }}</span>
          </div>
          <div class="folder-sidebar__item-right">
            <span v-if="folder.assetCount !== undefined" class="folder-sidebar__item-count">
              {{ folder.assetCount }}
            </span>
            <button
              class="folder-sidebar__item-menu"
              @click="toggleMenu($event, folder.id)"
              title="More options"
            >
              <AppIcon name="more-vertical" :size="14" />
            </button>
          </div>
        </button>

        <!-- Dropdown Menu -->
        <div v-if="openMenuId === folder.id" class="folder-sidebar__dropdown" @click.stop>
          <button class="folder-sidebar__dropdown-item" @click="handleRename(folder)">
            <AppIcon name="edit" :size="14" />
            <span>Rename</span>
          </button>
          <button class="folder-sidebar__dropdown-item folder-sidebar__dropdown-item--danger" @click="handleDelete(folder.id)">
            <AppIcon name="trash" :size="14" />
            <span>Delete</span>
          </button>
        </div>

        <!-- Backdrop to close menu -->
        <div v-if="openMenuId === folder.id" class="folder-sidebar__backdrop" @click="closeMenu"></div>
      </div>
    </div>

    <!-- Create Folder Button -->
    <button class="folder-sidebar__create" @click="emit('create')">
      <AppIcon name="plus" :size="16" />
      <span>New Folder</span>
    </button>
  </aside>
</template>

<style scoped>
.folder-sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  flex-shrink: 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

/* Header */
.folder-sidebar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
}

.folder-sidebar__title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.folder-sidebar__count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

/* List */
.folder-sidebar__list {
  flex: 1;
  overflow-y: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem;
}

.folder-sidebar__divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

/* Item Wrapper */
.folder-sidebar__item-wrapper {
  position: relative;
}

/* Items */
.folder-sidebar__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.folder-sidebar__item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.folder-sidebar__item--active {
  background: var(--accent-color) !important;
  color: white !important;
}

.folder-sidebar__item--all {
  font-weight: 500;
}

.folder-sidebar__item-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.folder-sidebar__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-sidebar__item-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.folder-sidebar__item-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 1.5rem;
  text-align: right;
}

.folder-sidebar__item--active .folder-sidebar__item-count {
  color: rgba(255, 255, 255, 0.8);
}

/* Menu button */
.folder-sidebar__item-menu {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.folder-sidebar__item:hover .folder-sidebar__item-menu {
  display: flex;
}

.folder-sidebar__item:hover .folder-sidebar__item-count {
  display: none;
}

.folder-sidebar__item-menu:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.folder-sidebar__item--active .folder-sidebar__item-menu {
  color: rgba(255, 255, 255, 0.8);
}

.folder-sidebar__item--active .folder-sidebar__item-menu:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Dropdown menu */
.folder-sidebar__dropdown {
  position: absolute;
  top: 100%;
  right: 0.5rem;
  margin-top: 2px;
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

.folder-sidebar__dropdown-item {
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

.folder-sidebar__dropdown-item:hover {
  background: var(--color-bg-elevated, #2a2a2a);
}

.folder-sidebar__dropdown-item--danger {
  color: var(--color-error, #ef4444);
}

.folder-sidebar__dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Invisible backdrop to close menu */
.folder-sidebar__backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

/* Loading */
.folder-sidebar__loading {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.folder-sidebar__skeleton {
  height: 36px;
  background: linear-gradient(90deg, var(--bg-tertiary) 0%, #333 50%, var(--bg-tertiary) 100%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Empty State */
.folder-sidebar__empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Create Button */
.folder-sidebar__create {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  margin-top: 1rem;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.folder-sidebar__create:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
  color: var(--accent-color);
}
</style>
