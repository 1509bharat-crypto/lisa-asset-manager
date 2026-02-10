<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppSpinner } from '../components/atoms'
import { ConfirmDialog } from '../components/molecules'
import {
  AppHeader,
  ProjectCard,
  CreateProjectModal,
  EditProjectModal
} from '../components/organisms'
import { useProjects, useRealtimeSync } from '../composables'
import { analytics } from '../services/analytics'
import type { Project } from '../types'

const router = useRouter()
const {
  projects,
  loading,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject
} = useProjects()
const { on } = useRealtimeSync()

const showCreateModal = ref(false)
const projectToDelete = ref<string | null>(null)
const projectToEdit = ref<(Project & { asset_count?: number }) | null>(null)

onMounted(() => {
  fetchProjects()
})

// Re-fetch from database when server broadcasts changes
on('projects_changed', () => fetchProjects(true))
on('assets_changed', () => fetchProjects(true))

const handleProjectClick = (id: string) => {
  const project = projects.value.find(p => p.id === id)
  if (project) {
    analytics.projectOpened(id, project.name)
  }
  router.push({ name: 'assets', params: { projectId: id } })
}

const handleCreateProject = async (data: {
  name: string
  description: string
  color: string
}) => {
  const project = await createProject(data)
  if (project) {
    analytics.projectCreated(data.name)
    showCreateModal.value = false
  }
}

const handleDeleteProject = async () => {
  if (projectToDelete.value) {
    analytics.projectDeleted(projectToDelete.value)
    await deleteProject(projectToDelete.value)
    projectToDelete.value = null
  }
}

const handleEditProject = async (data: {
  name: string
  description: string
  color: string
}) => {
  if (projectToEdit.value) {
    const result = await updateProject(projectToEdit.value.id, data)
    if (result) {
      analytics.projectRenamed(projectToEdit.value.id, data.name)
      projectToEdit.value = null
    }
  }
}
</script>

<template>
  <div class="projects-view">
    <AppHeader @create-project="showCreateModal = true" />

    <main class="projects-view__content">
      <!-- Loading -->
      <div v-if="loading" class="projects-view__loading">
        <AppSpinner size="lg" />
        <p>Loading projects...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="projects.length === 0" class="projects-view__empty">
        <div class="projects-view__empty-icon">📁</div>
        <h2>No Projects Yet</h2>
        <p>Create your first project to start organizing assets</p>
        <button class="projects-view__empty-button" @click="showCreateModal = true">
          Create Project
        </button>
      </div>

      <!-- Projects grid -->
      <div v-else class="projects-view__grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="handleProjectClick(project.id)"
          @delete="projectToDelete = project.id"
          @rename="projectToEdit = $event"
        />
      </div>
    </main>

    <!-- Create Project Modal -->
    <CreateProjectModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @create="handleCreateProject"
    />

    <!-- Edit Project Modal -->
    <EditProjectModal
      v-if="projectToEdit"
      :project="projectToEdit"
      @close="projectToEdit = null"
      @save="handleEditProject"
    />

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-if="projectToDelete"
      title="Delete Project"
      message="Are you sure you want to delete this project? All assets will be permanently removed."
      confirm-text="Delete"
      variant="danger"
      @confirm="handleDeleteProject"
      @cancel="projectToDelete = null"
    />
  </div>
</template>

<style scoped>
.projects-view {
  min-height: 100vh;
  background: var(--color-bg);
}

.projects-view__content {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.projects-view__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xxl);
  color: var(--color-text-secondary);
}

.projects-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xxl);
  text-align: center;
}

.projects-view__empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-lg);
}

.projects-view__empty h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-sm);
}

.projects-view__empty p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.projects-view__empty-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.projects-view__empty-button:hover {
  background: var(--color-primary-hover);
}

.projects-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}
</style>
