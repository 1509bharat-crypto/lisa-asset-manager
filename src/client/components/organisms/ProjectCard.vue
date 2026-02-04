<script setup lang="ts">
import { computed, ref } from 'vue'
import { AppIcon } from '../atoms'
import type { Project } from '../../types'

interface Props {
  project: Project & { asset_count?: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
  delete: []
  rename: [project: Project & { asset_count?: number }]
}>()

const showMenu = ref(false)

const toggleMenu = (event: Event) => {
  event.stopPropagation()
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const handleRename = () => {
  emit('rename', props.project)
  closeMenu()
}

const handleDelete = () => {
  emit('delete')
  closeMenu()
}

// Sanitize color to prevent CSS injection
const safeColor = computed(() => {
  return /^#[0-9a-fA-F]{6}$/.test(props.project.color)
    ? props.project.color
    : '#667eea'
})

const assetCount = computed(() => props.project.asset_count || 0)
</script>

<template>
  <div
    class="project-card"
    :style="{ borderColor: safeColor }"
    @click="emit('click')"
  >
    <!-- Cover image -->
    <div class="project-card__cover" :style="{ background: project.cover_image ? 'transparent' : `${safeColor}15` }">
      <img
        v-if="project.cover_image"
        :src="project.cover_image"
        :alt="project.name"
        class="project-card__cover-image"
      />
      <AppIcon v-else name="image" :size="32" class="project-card__cover-placeholder" />
    </div>

    <div class="project-card__header">
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
    </div>

    <!-- Three-dot menu -->
    <div class="project-card__menu-wrapper">
      <button
        class="project-card__menu-btn"
        @click="toggleMenu"
        title="More options"
      >
        <AppIcon name="more-vertical" :size="18" />
      </button>
      <div v-if="showMenu" class="project-card__dropdown" @click.stop>
        <button class="project-card__dropdown-item" @click="handleRename">
          <AppIcon name="edit" :size="14" />
          <span>Edit</span>
        </button>
        <button class="project-card__dropdown-item project-card__dropdown-item--danger" @click="handleDelete">
          <AppIcon name="trash" :size="14" />
          <span>Delete</span>
        </button>
      </div>
    </div>

    <!-- Click outside to close menu -->
    <div v-if="showMenu" class="project-card__backdrop" @click="closeMenu"></div>
  </div>
</template>

<style scoped>
.project-card {
  position: relative;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fadeIn 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.project-card__cover {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px 10px 0 0;
  overflow: hidden;
}

.project-card__cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-card__cover-placeholder {
  color: var(--color-text-muted);
  opacity: 0.3;
}

.project-card__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  margin: 0.5rem;
}

.project-card__color-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-card__name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.project-card__description {
  padding: 0 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-card__stats {
  display: flex;
  gap: 1.5rem;
  padding: 0 1rem 1rem;
}

.project-card__stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.project-card__stat :deep(svg) {
  color: var(--accent-color);
}

.project-card__menu-wrapper {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.project-card__menu-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  opacity: 0;
}

.project-card:hover .project-card__menu-btn {
  opacity: 1;
}

.project-card__menu-btn:hover {
  background: var(--color-surface-elevated);
  border-color: var(--color-border-hover);
}

.project-card__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 140px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
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

.project-card__dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.project-card__dropdown-item:hover {
  background: var(--color-bg-elevated);
}

.project-card__dropdown-item--danger {
  color: var(--color-error);
}

.project-card__dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.project-card__backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
