<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppSpinner, AppIcon, AppButton } from '../components/atoms'
import { ConfirmDialog, SearchBar } from '../components/molecules'
import {
  AppHeader,
  AssetGrid,
  FolderSidebar,
  UploadModal,
  CreateFolderModal,
  RenameAssetModal,
  RenameFolderModal,
  MoveAssetModal,
  BulkMoveModal,
  LogoFinderPanel
} from '../components/organisms'
import { useProjects, useAssets, useFolders, useRealtimeSync } from '../composables'
import { analytics } from '../services/analytics'
import { api } from '../services/api'
import type { Asset, Folder } from '../types'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)

const { projects, getProjectById, fetchProjects, setProjectCover } = useProjects()
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
const assetToRename = ref<Asset | null>(null)
const folderToRename = ref<Folder | null>(null)
const folderToDelete = ref<string | null>(null)
const selectedAssets = ref<string[]>([])
const assetToDelete = ref<string | null>(null)
const showBulkDeleteConfirm = ref(false)
const showBulkMoveModal = ref(false)
const assetToMove = ref<Asset | null>(null)
const searchQuery = ref('')
const showLogoFinderPanel = ref(false)
// Grid size: smaller value = more icons per row
// Range designed for ~5 to ~8 icons per row depending on viewport
const gridSize = ref(160) // Default - around 6-7 icons per row on typical screen
const GRID_SIZE_MIN = 130  // ~8 icons per row
const GRID_SIZE_MAX = 220  // ~5 icons per row

const loading = computed(() => assetsLoading.value || foldersLoading.value)

const { on } = useRealtimeSync()

onMounted(async () => {
  await fetchProjects()
  if (!project.value) {
    router.push({ name: 'projects' })
    return
  }
  fetchFolders(projectId.value)
  fetchAssets(projectId.value)
})

// Re-fetch from database when server broadcasts changes
on('assets_changed', () => fetchAssets(projectId.value))
on('folders_changed', () => fetchFolders(projectId.value))

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
  analytics.assetUploaded(files.length, projectId.value)
  showUploadModal.value = false
}

const handleCreateFolder = async (name: string) => {
  await createFolder(projectId.value, name)
  analytics.folderCreated(projectId.value)
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
    analytics.assetDeleted(1)
    assetToDelete.value = null
  }
}

const handleBulkDelete = async () => {
  if (selectedAssets.value.length > 0) {
    const count = selectedAssets.value.length
    await deleteAssets(selectedAssets.value)
    analytics.bulkDelete(count)
    selectedAssets.value = []
    showBulkDeleteConfirm.value = false
  }
}

const bulkFormat = ref<string | undefined>(undefined)
const showBulkFormatMenu = ref(false)

const handleBulkDownload = async () => {
  const selectedAssetObjects = allAssets.value.filter(a => selectedAssets.value.includes(a.id))
  if (selectedAssetObjects.length === 0) return

  analytics.bulkDownload(selectedAssetObjects.length)

  const formatSuffix = bulkFormat.value ? `?format=${bulkFormat.value}` : ''

  // Single file - just download directly
  if (selectedAssetObjects.length === 1) {
    const asset = selectedAssetObjects[0]
    const filename = bulkFormat.value ? replaceExtension(asset.name, bulkFormat.value) : asset.name
    const link = document.createElement('a')
    link.href = `/api/assets/${asset.id}/image${formatSuffix}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }

  // Multiple files - create zip
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (const asset of selectedAssetObjects) {
    const response = await fetch(`/api/assets/${asset.id}/image${formatSuffix}`)
    const blob = await response.blob()
    const filename = bulkFormat.value ? replaceExtension(asset.name, bulkFormat.value) : asset.name
    zip.file(filename, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.value?.name || 'assets'}-${selectedAssetObjects.length}-files.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleBulkMove = async (newProjectId: string, newFolderId: string | null) => {
  // Move each selected asset
  for (const assetId of selectedAssets.value) {
    await api.moveAsset(assetId, newProjectId, newFolderId)
  }
  // Re-fetch and clear selection
  await fetchAssets(projectId.value)
  selectedAssets.value = []
  showBulkMoveModal.value = false
}

function replaceExtension(filename: string, format: string): string {
  const extMap: Record<string, string> = { png: '.png', jpg: '.jpg', webp: '.webp', svg: '.svg' }
  const newExt = extMap[format] || ''
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return filename + newExt
  return filename.substring(0, lastDot) + newExt
}

const handleDownload = (asset: Asset, format?: string) => {
  analytics.assetDownloaded(asset.id, asset.name)
  let url = `/api/assets/${asset.id}/image`
  if (format) url += `?format=${format}`
  const filename = format ? replaceExtension(asset.name, format) : asset.name
  const link = document.createElement('a')
  link.href = url
  link.download = filename
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
  // Fetch the full asset data for the cover image
  const response = await fetch(`/api/assets/${asset.id}`)
  const fullAsset = await response.json()
  await setProjectCover(projectId.value, asset.id, fullAsset.data)
}

const handleMoveAsset = async (assetId: string, newProjectId: string, newFolderId: string | null) => {
  const result = await api.moveAsset(assetId, newProjectId, newFolderId)
  if (!result.error) {
    // Re-fetch assets to reflect the change
    await fetchAssets(projectId.value)
  }
  assetToMove.value = null
}

const handleLogosAdd = async (logos: { dataUrl: string; brandName: string }[]) => {
  // Convert each logo to File and upload
  const files: File[] = []
  for (const logo of logos) {
    analytics.iconAdded(logo.brandName)
    const response = await fetch(logo.dataUrl)
    const blob = await response.blob()
    const file = new File([blob], `${logo.brandName.toLowerCase().replace(/\s+/g, '-')}-logo.png`, { type: 'image/png' })
    files.push(file)
  }

  // Upload all as assets
  await uploadAssets(projectId.value, files, selectedFolderId.value)
}
</script>

<template>
  <div class="assets-view">
    <AppHeader
      :project-name="project?.name"
      @back="handleBack"
      @upload="showUploadModal = true"
    >
      <template #actions>
        <AppButton
          variant="ghost"
          size="sm"
          :class="{ 'assets-view__logo-btn--active': showLogoFinderPanel }"
          @click="showLogoFinderPanel = !showLogoFinderPanel"
        >
          <AppIcon name="image" :size="16" />
          Generate Icon
        </AppButton>
        <AppButton
          size="sm"
          @click="showUploadModal = true"
        >
          <AppIcon name="upload" :size="16" />
          Upload
        </AppButton>
      </template>
    </AppHeader>

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

      <!-- Main content area wrapper -->
      <div class="assets-view__main-wrapper">
        <!-- Main content -->
        <div class="assets-view__main">
        <!-- Toolbar with search and grid controls -->
        <div class="assets-view__toolbar">
          <!-- Search bar -->
          <SearchBar
            :model-value="searchQuery"
            placeholder="Search assets..."
            class="assets-view__search"
            @update:model-value="handleSearch"
          />

          <div class="assets-view__spacer"></div>

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
          selectable
          @preview="(asset) => handleAssetSelect(asset.id, !selectedAssets.includes(asset.id))"
          @select="(id) => handleAssetSelect(id, !selectedAssets.includes(id))"
          @delete="(id) => { assetToDelete = id }"
          @download="(asset, format) => handleDownload(asset, format)"
          @rename="(asset) => { assetToRename = asset }"
          @set-as-cover="handleSetAsCover"
          @move="(asset) => { assetToMove = asset }"
        />
        </div>

        <!-- Logo Finder Panel (slide-over) -->
        <LogoFinderPanel
          v-if="showLogoFinderPanel"
          @close="showLogoFinderPanel = false"
          @add="handleLogosAdd"
        />
      </div>
    </main>

    <!-- Floating bulk actions toolbar -->
    <Transition name="slide-up">
      <div v-if="selectedAssets.length > 0" class="assets-view__bulk-toolbar">
        <span class="assets-view__bulk-count">{{ selectedAssets.length }} selected</span>
        <button @click="selectedAssets = []">Clear</button>
        <div class="assets-view__bulk-download-group">
          <button @click="handleBulkDownload">
            <AppIcon name="download" :size="14" />
            Download{{ bulkFormat ? ` as ${bulkFormat.toUpperCase()}` : '' }}
          </button>
          <button class="assets-view__bulk-format-trigger" @click.stop="showBulkFormatMenu = !showBulkFormatMenu">
            <AppIcon name="chevron-down" :size="12" />
          </button>
          <div v-if="showBulkFormatMenu" class="assets-view__bulk-format-dropdown">
            <button @click="bulkFormat = undefined; showBulkFormatMenu = false">Original</button>
            <button @click="bulkFormat = 'png'; showBulkFormatMenu = false">PNG</button>
            <button @click="bulkFormat = 'jpg'; showBulkFormatMenu = false">JPG</button>
            <button @click="bulkFormat = 'webp'; showBulkFormatMenu = false">WebP</button>
            <button @click="bulkFormat = 'svg'; showBulkFormatMenu = false">SVG</button>
          </div>
        </div>
        <button @click="showBulkMoveModal = true">
          <AppIcon name="move" :size="14" />
          Move
        </button>
        <button class="danger" @click="showBulkDeleteConfirm = true">
          <AppIcon name="trash" :size="14" />
          Delete
        </button>
      </div>
    </Transition>

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

    <MoveAssetModal
      v-if="assetToMove"
      :asset="assetToMove"
      :projects="[...projects]"
      :current-project-id="projectId"
      @close="assetToMove = null"
      @move="handleMoveAsset"
    />

    <BulkMoveModal
      v-if="showBulkMoveModal"
      :asset-count="selectedAssets.length"
      :projects="[...projects]"
      :current-project-id="projectId"
      @close="showBulkMoveModal = false"
      @move="handleBulkMove"
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

.assets-view__main-wrapper {
  flex: 1;
  display: flex;
  min-width: 0;
}

.assets-view__main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  min-width: 0;
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

/* Floating bulk toolbar */
.assets-view__bulk-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.assets-view__bulk-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  padding-right: var(--space-sm);
  border-right: 1px solid var(--color-border);
}

.assets-view__bulk-toolbar button {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.assets-view__bulk-toolbar button:hover {
  background: var(--color-border);
}

.assets-view__bulk-toolbar button.danger {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.assets-view__bulk-toolbar button.danger:hover {
  opacity: 0.9;
}

.assets-view__bulk-download-group {
  display: flex;
  position: relative;
}

.assets-view__bulk-download-group > button:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.assets-view__bulk-format-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0 !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  margin-left: -1px;
}

.assets-view__bulk-format-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 4px;
  min-width: 120px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 110;
}

.assets-view__bulk-format-dropdown button {
  display: block;
  width: 100%;
  text-align: left;
  border: none !important;
  border-radius: 0 !important;
  padding: 8px 12px !important;
}

/* Slide up animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
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

.assets-view__logo-btn--active {
  background: var(--color-primary-light) !important;
  color: var(--color-primary) !important;
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
