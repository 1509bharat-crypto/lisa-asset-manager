<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppSpinner } from '../components/atoms'
import { StatCard, ConfirmDialog } from '../components/molecules'
import {
  AppHeader,
  ProjectCard,
  CreateProjectModal
} from '../components/organisms'
import { useProjects } from '../composables'

const router = useRouter()
const { projects, loading, fetchProjects, createProject, deleteProject } =
  useProjects()

const showCreateModal = ref(false)
const projectToDelete = ref<string | null>(null)

onMounted(() => {
  fetchProjects()
})

const handleProjectClick = (id: string) => {
  router.push({ name: 'assets', params: { projectId: id } })
}

const handleCreateProject = async (data: {
  name: string
  description: string
  color: string
}) => {
  const project = await createProject(data)
  if (project) {
    showCreateModal.value = false
  }
}

const handleDeleteProject = async () => {
  if (projectToDelete.value) {
    await deleteProject(projectToDelete.value)
    projectToDelete.value = null
  }
}

const totalAssets = () =>
  projects.value.reduce((sum, p) => sum + p.asset_count, 0)

const totalStorage = () =>
  projects.value.reduce((sum, p) => sum + p.total_size, 0)

const formatStorage = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>

<template>
  <div class="projects-view">
    <AppHeader @create-project="showCreateModal = true" />

    <main class="projects-view__content">
      <!-- Stats -->
      <div class="projects-view__stats">
        <StatCard
          icon="folder"
          :value="projects.length"
          label="Projects"
        />
        <StatCard
          icon="image"
          :value="totalAssets()"
          label="Total Assets"
        />
        <StatCard
          icon="storage"
          :value="formatStorage(totalStorage())"
          label="Storage Used"
        />
      </div>

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
        />
      </div>
    </main>

    <!-- Create Project Modal -->
    <CreateProjectModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @create="handleCreateProject"
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

.projects-view__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
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
