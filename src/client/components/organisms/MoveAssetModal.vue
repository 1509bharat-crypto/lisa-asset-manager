<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AppButton, AppCard, AppIcon, AppSpinner } from '../atoms'
import type { Asset, Project, Folder } from '../../types'

interface Props {
  asset: Asset
  projects: Project[]
  currentProjectId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  move: [assetId: string, projectId: string, folderId: string | null]
}>()

const selectedProjectId = ref<string>(props.currentProjectId)
const selectedFolderId = ref<string | null>(props.asset.folder_id)
const folders = ref<Folder[]>([])
const loadingFolders = ref(false)
const moving = ref(false)

// Fetch folders when project changes
const fetchFolders = async (projectId: string) => {
  loadingFolders.value = true
  try {
    const response = await fetch('/api/folders')
    if (response.ok) {
      const allFolders = await response.json()
      // Filter folders by project_id
      folders.value = allFolders.filter((f: Folder) => f.project_id === projectId)
    }
  } catch (error) {
    console.error('Failed to fetch folders:', error)
    folders.value = []
  } finally {
    loadingFolders.value = false
  }
}

// Watch for project changes
watch(selectedProjectId, (newProjectId) => {
  // Reset folder selection when project changes
  if (newProjectId !== props.currentProjectId) {
    selectedFolderId.value = null
  } else {
    selectedFolderId.value = props.asset.folder_id
  }
  fetchFolders(newProjectId)
}, { immediate: true })

const hasChanges = computed(() => {
  return selectedProjectId.value !== props.currentProjectId ||
    selectedFolderId.value !== props.asset.folder_id
})

const selectedProject = computed(() => {
  return props.projects.find(p => p.id === selectedProjectId.value)
})

const handleMove = async () => {
  if (!hasChanges.value) return

  moving.value = true
  emit('move', props.asset.id, selectedProjectId.value, selectedFolderId.value)
}
</script>

<template>
  <Teleport to="body">
    <div class="move-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="move-modal">
        <div class="move-modal__header">
          <h2 class="move-modal__title">Move Asset</h2>
          <AppButton variant="ghost" size="sm" @click="emit('close')">
            <AppIcon name="x" :size="20" />
          </AppButton>
        </div>

        <p class="move-modal__asset-name">{{ asset.name }}</p>

        <!-- Project selector -->
        <div class="move-modal__section">
          <label class="move-modal__label">Project</label>
          <select v-model="selectedProjectId" class="move-modal__select">
            <option
              v-for="project in projects"
              :key="project.id"
              :value="project.id"
            >
              {{ project.name }}
            </option>
          </select>
        </div>

        <!-- Folder selector -->
        <div class="move-modal__section">
          <label class="move-modal__label">Folder</label>
          <div v-if="loadingFolders" class="move-modal__loading">
            <AppSpinner size="sm" />
            <span>Loading folders...</span>
          </div>
          <select v-else v-model="selectedFolderId" class="move-modal__select">
            <option :value="null">No folder (root)</option>
            <option
              v-for="folder in folders"
              :key="folder.id"
              :value="folder.id"
            >
              {{ folder.name }}
            </option>
          </select>
        </div>

        <!-- Current location info -->
        <div v-if="hasChanges" class="move-modal__info">
          <AppIcon name="info" :size="16" />
          <span>Moving to: {{ selectedProject?.name }}{{ selectedFolderId ? ` / ${folders.find(f => f.id === selectedFolderId)?.name}` : '' }}</span>
        </div>

        <!-- Actions -->
        <div class="move-modal__actions">
          <AppButton variant="secondary" @click="emit('close')">
            Cancel
          </AppButton>
          <AppButton
            :disabled="!hasChanges || moving"
            :loading="moving"
            @click="handleMove"
          >
            <AppIcon name="move" :size="16" />
            Move
          </AppButton>
        </div>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.move-modal__overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
  animation: fadeIn var(--transition-fast);
}

.move-modal {
  width: 100%;
  max-width: 420px;
  animation: slideUp var(--transition-normal);
}

.move-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.move-modal__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.move-modal__asset-name {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.move-modal__section {
  margin-bottom: var(--space-md);
}

.move-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.move-modal__select {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface, #1a1a1a);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.move-modal__select option {
  background: var(--color-surface, #1a1a1a);
  color: var(--color-text-primary);
  padding: 8px;
}

.move-modal__select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.move-modal__loading {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.move-modal__info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-primary-light, rgba(99, 102, 241, 0.1));
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  margin-bottom: var(--space-lg);
}

.move-modal__actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
