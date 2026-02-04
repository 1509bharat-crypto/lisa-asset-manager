<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppSpinner, AppIcon } from '../components/atoms'
import { ConfirmDialog, SearchBar } from '../components/molecules'
import {
  AppHeader,
  AssetGrid,
  FolderSidebar,
  UploadModal,
  CreateFolderModal,
  RenameAssetModal,
  RenameFolderModal,
  AssetPreviewModal
} from '../components/organisms'
import { useProjects, useAssets, useFolders } from '../composables'
import type { Asset, Folder } from '../types'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)

const { getProjectById, fetchProjects, setProjectCover } = useProjects()
const {
  assets,
  allAssets,
  loading: assetsLoading,
  fetchAssets,
  uploadAssets,
  deleteAsset,
  deleteAssets,
  renameAsset,
  searchAssets,
  clearAssets
} = useAssets()
const {
  folders,
  selectedFolderId,
  loading: foldersLoading,
  fetchFolders,
  createFolder,
  deleteFolder,
  renameFolder,
  selectFolder,
  clearFolders,
  updateFolderCounts
} = useFolders()

const project = computed(() => getProjectById(projectId.value))
const totalAssetCount = computed(() => allAssets.value.length)

const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const previewAsset = ref<Asset | null>(null)
const assetToRename = ref<Asset | null>(null)
const folderToRename = ref<Folder | null>(null)
const folderToDelete = ref<string | null>(null)
const selectedAssets = ref<string[]>([])
const assetToDelete = ref<string | null>(null)
const showBulkDeleteConfirm = ref(false)
const searchQuery = ref('')
// Grid size: smaller value = more icons per row
// Range designed for ~5 to ~8 icons per row depending on viewport
const gridSize = ref(160) // Default - around 6-7 icons per row on typical screen
const GRID_SIZE_MIN = 130  // ~8 icons per row
const GRID_SIZE_MAX = 220  // ~5 icons per row

const loading = computed(() => assetsLoading.value || foldersLoading.value)

onMounted(async () => {
  // Use cached projects data if available (don't force refresh)
  await fetchProjects()
  if (!project.value) {
    router.push({ name: 'projects' })
    return
  }
  fetchFolders(projectId.value)
  fetchAssets(projectId.value)
})

// Update folder counts when all assets change
watch(
  () => allAssets.value,
  (newAssets) => {
    updateFolderCounts([...newAssets])
  },
  { immediate: true }
)

// Filter assets when selected folder changes (client-side filtering now)
const handleFolderSelect = (id: string | null) => {
  selectFolder(id)
  // Re-fetch to apply filter (composable handles filtering)
  fetchAssets(projectId.value, id)
}

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

const handleUploadWithFolder = async (files: File[], folderId: string | null) => {
  await uploadAssets(projectId.value, files, folderId)
  showUploadModal.value = false
}

const handleCreateFolder = async (name: string) => {
  await createFolder(projectId.value, name)
  showCreateFolderModal.value = false
}

const handleCreateFolderFromUpload = async (name: string) => {
  await createFolder(projectId.value, name)
}

const handleFolderDeleteRequest = (id: string) => {
  folderToDelete.value = id
}

// Get count of assets in the folder being deleted
const folderToDeleteAssetCount = computed(() => {
  if (!folderToDelete.value) return 0
  return allAssets.value.filter(a => a.folder_id === folderToDelete.value).length
})

const handleFolderDelete = async () => {
  if (folderToDelete.value) {
    // First delete all assets in the folder
    const assetsInFolder = allAssets.value
      .filter(a => a.folder_id === folderToDelete.value)
      .map(a => a.id)

    if (assetsInFolder.length > 0) {
      await deleteAssets(assetsInFolder)
    }

    // Then delete the folder
    await deleteFolder(projectId.value, folderToDelete.value)
    folderToDelete.value = null
  }
}

const handleFolderRenameRequest = (folder: Folder) => {
  folderToRename.value = folder
}

const handleFolderRename = async (newName: string) => {
  if (folderToRename.value) {
    await renameFolder(folderToRename.value.id, newName)
    folderToRename.value = null
  }
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
  // Create a download link from the data URL
  const link = document.createElement('a')
  link.href = asset.data
  link.download = asset.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleRename = async (newName: string) => {
  if (assetToRename.value) {
    await renameAsset(assetToRename.value.id, newName)
    assetToRename.value = null
  }
}

const handleSetAsCover = async (asset: Asset) => {
  await setProjectCover(projectId.value, asset.id, asset.data)
}
</script>

<template>
  <div class="assets-view">
    <AppHeader
      :project-name="project?.name"
      :show-back="true"
      @back="handleBack"
      @upload="showUploadModal = true"
    />

    <main class="assets-view__content">
      <!-- Sidebar with folders -->
      <FolderSidebar
        :folders="[...folders]"
        :selected="selectedFolderId"
        :total-assets="totalAssetCount"
        :loading="foldersLoading"
        @select="handleFolderSelect"
        @delete="handleFolderDeleteRequest"
        @rename="handleFolderRenameRequest"
        @create="showCreateFolderModal = true"
      />

      <!-- Main content -->
      <div class="assets-view__main">
        <!-- Toolbar with search, bulk actions and grid controls -->
        <div class="assets-view__toolbar">
          <!-- Search bar -->
          <SearchBar
            :model-value="searchQuery"
            placeholder="Search assets..."
            class="assets-view__search"
            @update:model-value="handleSearch"
          />

          <!-- Bulk actions -->
          <div v-if="selectedAssets.length > 0" class="assets-view__bulk-actions">
            <span>{{ selectedAssets.length }} selected</span>
            <button @click="selectedAssets = []">Clear</button>
            <button class="danger" @click="showBulkDeleteConfirm = true">
              Delete Selected
            </button>
          </div>
          <div v-else class="assets-view__spacer"></div>

          <!-- Grid size slider -->
          <div class="assets-view__grid-controls">
            <AppIcon name="grid-small" :size="16" class="assets-view__grid-icon" title="More items" />
            <input
              type="range"
              v-model.number="gridSize"
              :min="GRID_SIZE_MIN"
              :max="GRID_SIZE_MAX"
              class="assets-view__grid-slider"
              title="Adjust grid density"
            />
            <AppIcon name="grid-large" :size="16" class="assets-view__grid-icon" title="Larger items" />
          </div>
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
          :folders="[...folders]"
          :grid-size="gridSize"
          :loading="loading"
          :selected-ids="selectedAssets"
          @preview="handleAssetClick"
          @select="(id) => handleAssetSelect(id, !selectedAssets.includes(id))"
          @delete="(id) => { assetToDelete = id }"
          @download="handleDownload"
          @rename="(asset) => { assetToRename = asset }"
          @set-as-cover="handleSetAsCover"
        />
      </div>
    </main>

    <!-- Modals -->
    <UploadModal
      v-if="showUploadModal"
      :folders="[...folders]"
      :current-folder-id="selectedFolderId"
      @close="showUploadModal = false"
      @upload="handleUploadWithFolder"
      @create-folder="handleCreateFolderFromUpload"
    />

    <CreateFolderModal
      v-if="showCreateFolderModal"
      @close="showCreateFolderModal = false"
      @create="handleCreateFolder"
    />

    <RenameAssetModal
      v-if="assetToRename"
      :asset="assetToRename"
      @close="assetToRename = null"
      @rename="handleRename"
    />

    <RenameFolderModal
      v-if="folderToRename"
      :folder="folderToRename"
      @close="folderToRename = null"
      @rename="handleFolderRename"
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

    <ConfirmDialog
      v-if="folderToDelete"
      title="Delete Folder"
      :message="folderToDeleteAssetCount > 0
        ? `This folder and ${folderToDeleteAssetCount} asset${folderToDeleteAssetCount === 1 ? '' : 's'} inside will be permanently deleted.`
        : 'Are you sure you want to delete this empty folder?'"
      confirm-text="Delete"
      variant="danger"
      @confirm="handleFolderDelete"
      @cancel="folderToDelete = null"
    />
  </div>
</template>

<style scoped>
.assets-view {
  height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.assets-view__content {
  display: flex;
  flex: 1;
  min-height: 0; /* Important for flex children to scroll properly */
}

.assets-view__main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.assets-view__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
  min-height: 40px;
}

.assets-view__search {
  width: 280px;
  flex-shrink: 0;
}

.assets-view__spacer {
  flex: 1;
}

.assets-view__grid-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
}

.assets-view__grid-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.assets-view__grid-slider {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.assets-view__grid-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.assets-view__grid-slider::-webkit-slider-thumb:hover {
  background: var(--color-primary-hover);
}

.assets-view__grid-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.assets-view__grid-slider::-moz-range-thumb:hover {
  background: var(--color-primary-hover);
}

.assets-view__bulk-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
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

  .assets-view__content :deep(.folder-sidebar) {
    max-height: 250px;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
