<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppSpinner } from '../components/atoms'
import { ConfirmDialog } from '../components/molecules'
import {
  AppHeader,
  AssetGrid,
  FolderTree,
  UploadModal,
  CreateFolderModal,
  AssetPreviewModal
} from '../components/organisms'
import { useProjects, useAssets, useFolders } from '../composables'
import type { Asset } from '../types'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)

const { getProjectById, fetchProjects } = useProjects()
const {
  assets,
  loading: assetsLoading,
  fetchAssets,
  uploadAssets,
  deleteAsset,
  deleteAssets,
  searchAssets,
  clearAssets
} = useAssets()
const {
  folders,
  selectedFolders,
  loading: foldersLoading,
  fetchFolders,
  createFolder,
  deleteFolder,
  toggleFolder,
  clearSelection,
  clearFolders
} = useFolders()

const project = computed(() => getProjectById(projectId.value))

const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const previewAsset = ref<Asset | null>(null)
const selectedAssets = ref<string[]>([])
const assetToDelete = ref<string | null>(null)
const showBulkDeleteConfirm = ref(false)
const searchQuery = ref('')

const loading = computed(() => assetsLoading.value || foldersLoading.value)

onMounted(async () => {
  await fetchProjects()
  if (!project.value) {
    router.push({ name: 'projects' })
    return
  }
  fetchFolders(projectId.value)
  fetchAssets(projectId.value)
})

watch(
  () => selectedFolders.value,
  () => {
    if (selectedFolders.value.length > 0) {
      fetchAssets(projectId.value, selectedFolders.value[0])
    } else {
      fetchAssets(projectId.value)
    }
  }
)

const handleBack = () => {
  clearAssets()
  clearFolders()
  router.push({ name: 'projects' })
}

const handleSearch = (query: string) => {
  searchQuery.value = query
  if (query.trim()) {
    searchAssets(projectId.value, query)
  } else {
    fetchAssets(projectId.value)
  }
}

const handleUpload = async (files: File[]) => {
  await uploadAssets(projectId.value, files, [...selectedFolders.value])
  showUploadModal.value = false
}

const handleCreateFolder = async (name: string) => {
  await createFolder(projectId.value, name)
  showCreateFolderModal.value = false
}

const handleFolderClick = (name: string) => {
  toggleFolder(name)
}

const handleFolderDelete = async (name: string) => {
  await deleteFolder(projectId.value, name)
}

const handleAssetClick = (asset: Asset) => {
  previewAsset.value = asset
}

const handleAssetSelect = (id: string, selected: boolean) => {
  if (selected) {
    if (!selectedAssets.value.includes(id)) {
      selectedAssets.value.push(id)
    }
  } else {
    selectedAssets.value = selectedAssets.value.filter((a) => a !== id)
  }
}

const handleDeleteAsset = async () => {
  if (assetToDelete.value) {
    await deleteAsset(assetToDelete.value)
    assetToDelete.value = null
    previewAsset.value = null
  }
}

const handleBulkDelete = async () => {
  if (selectedAssets.value.length > 0) {
    await deleteAssets(selectedAssets.value)
    selectedAssets.value = []
    showBulkDeleteConfirm.value = false
  }
}

const handleDownload = (asset: Asset) => {
  window.open(asset.url, '_blank')
}
</script>

<template>
  <div class="assets-view">
    <AppHeader
      :project-name="project?.name"
      :show-back="true"
      :search-query="searchQuery"
      @back="handleBack"
      @search="handleSearch"
      @upload="showUploadModal = true"
      @create-folder="showCreateFolderModal = true"
    />

    <main class="assets-view__content">
      <!-- Sidebar with folders -->
      <aside class="assets-view__sidebar">
        <FolderTree
          :folders="folders"
          :selected="[...selectedFolders]"
          :loading="foldersLoading"
          @select="handleFolderClick"
          @delete="handleFolderDelete"
          @clear="clearSelection"
        />
      </aside>

      <!-- Main content -->
      <div class="assets-view__main">
        <!-- Bulk actions -->
        <div v-if="selectedAssets.length > 0" class="assets-view__bulk-actions">
          <span>{{ selectedAssets.length }} selected</span>
          <button @click="selectedAssets = []">Clear</button>
          <button class="danger" @click="showBulkDeleteConfirm = true">
            Delete Selected
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading && assets.length === 0" class="assets-view__loading">
          <AppSpinner size="lg" />
          <p>Loading assets...</p>
        </div>

        <!-- Asset grid -->
        <AssetGrid
          v-else
          :assets="[...assets]"
          :loading="loading"
          :selected="selectedAssets"
          @click="handleAssetClick"
          @select="handleAssetSelect"
        />
      </div>
    </main>

    <!-- Modals -->
    <UploadModal
      v-if="showUploadModal"
      @close="showUploadModal = false"
      @upload="handleUpload"
    />

    <CreateFolderModal
      v-if="showCreateFolderModal"
      @close="showCreateFolderModal = false"
      @create="handleCreateFolder"
    />

    <AssetPreviewModal
      v-if="previewAsset"
      :asset="previewAsset"
      @close="previewAsset = null"
      @delete="assetToDelete = $event"
      @download="handleDownload"
    />

    <!-- Delete confirmations -->
    <ConfirmDialog
      v-if="assetToDelete"
      title="Delete Asset"
      message="Are you sure you want to delete this asset?"
      confirm-text="Delete"
      variant="danger"
      @confirm="handleDeleteAsset"
      @cancel="assetToDelete = null"
    />

    <ConfirmDialog
      v-if="showBulkDeleteConfirm"
      title="Delete Assets"
      :message="`Are you sure you want to delete ${selectedAssets.length} asset(s)?`"
      confirm-text="Delete All"
      variant="danger"
      @confirm="handleBulkDelete"
      @cancel="showBulkDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.assets-view {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
}

.assets-view__content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.assets-view__sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow-y: auto;
}

.assets-view__main {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
}

.assets-view__bulk-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.assets-view__bulk-actions span {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.assets-view__bulk-actions button {
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.assets-view__bulk-actions button:hover {
  background: var(--color-border);
}

.assets-view__bulk-actions button.danger {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.assets-view__bulk-actions button.danger:hover {
  opacity: 0.9;
}

.assets-view__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-xxl);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .assets-view__content {
    flex-direction: column;
  }

  .assets-view__sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 200px;
  }
}
</style>
