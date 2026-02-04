<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, AppCard, AppSpinner, AppIcon } from '../atoms'
import type { Folder } from '../../types'

interface Props {
  folders: Folder[]
  currentFolderId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  folders: () => [],
  currentFolderId: null
})

const emit = defineEmits<{
  close: []
  upload: [files: File[], folderId: string | null]
  createFolder: [name: string]
}>()

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const isDragging = ref(false)
const files = ref<File[]>([])
const uploading = ref(false)
const progress = ref(0)
const selectedFolderId = ref<string | null>(props.currentFolderId)
const showNewFolderInput = ref(false)
const newFolderName = ref('')
const newFolderInputRef = ref<HTMLInputElement | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)

const canUpload = computed(() => files.value.length > 0 && !uploading.value)

const openNewFolderInput = () => {
  showNewFolderInput.value = true
  setTimeout(() => newFolderInputRef.value?.focus(), 0)
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  const droppedFiles = e.dataTransfer?.files
  if (droppedFiles) {
    addFiles(Array.from(droppedFiles))
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
}

const addFiles = (newFiles: File[]) => {
  const validFiles = newFiles.filter(file => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.warn(`Invalid file type: ${file.type}`)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`File too large: ${file.name}`)
      return false
    }
    return true
  })

  files.value = [...files.value, ...validFiles]
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const handleUpload = async () => {
  if (!canUpload.value) return

  uploading.value = true
  progress.value = 0

  emit('upload', files.value, selectedFolderId.value)
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleCreateFolder = () => {
  if (newFolderName.value.trim()) {
    emit('createFolder', newFolderName.value.trim())
    newFolderName.value = ''
    showNewFolderInput.value = false
  }
}

const cancelNewFolder = () => {
  showNewFolderInput.value = false
  newFolderName.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="upload-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="upload-modal">
        <div class="upload-modal__header">
          <h2 class="upload-modal__title">Upload Assets</h2>
          <AppButton variant="ghost" size="sm" @click="emit('close')">
            <AppIcon name="x" :size="20" />
          </AppButton>
        </div>

        <!-- Folder selector -->
        <div class="upload-modal__folder-section">
          <label class="upload-modal__label">Upload to folder</label>

          <!-- Dropdown + button row -->
          <div class="upload-modal__folder-row">
            <select
              v-model="selectedFolderId"
              class="upload-modal__folder-select"
            >
              <option :value="null">No folder (root)</option>
              <option
                v-for="folder in folders"
                :key="folder.id"
                :value="folder.id"
              >
                {{ folder.name }}
              </option>
            </select>
            <button
              type="button"
              class="upload-modal__add-folder-btn"
              title="Create new folder"
              @click="openNewFolderInput"
            >
              <AppIcon name="plus" :size="18" />
            </button>
          </div>

          <!-- New folder input (shown when creating) -->
          <div v-if="showNewFolderInput" class="upload-modal__new-folder">
            <input
              ref="newFolderInputRef"
              v-model="newFolderName"
              type="text"
              placeholder="New folder name"
              class="upload-modal__new-folder-input"
              @keyup.enter="handleCreateFolder"
              @keyup.escape="cancelNewFolder"
            />
            <AppButton
              size="sm"
              :disabled="!newFolderName.trim()"
              @click="handleCreateFolder"
            >
              Create
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              @click="cancelNewFolder"
            >
              Cancel
            </AppButton>
          </div>
        </div>

        <!-- Drop zone -->
        <div
          :class="['upload-modal__dropzone', { 'upload-modal__dropzone--active': isDragging }]"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="upload-modal__input"
            @change="handleFileSelect"
          />

          <AppIcon name="upload" :size="48" class="upload-modal__icon" />
          <p class="upload-modal__dropzone-text">
            Drag & drop images here or <span class="upload-modal__link">browse</span>
          </p>
          <p class="upload-modal__dropzone-hint">
            Supports: JPEG, PNG, GIF, WebP, SVG (max 2MB)
          </p>
        </div>

        <!-- File list -->
        <div v-if="files.length > 0" class="upload-modal__files">
          <div v-for="(file, index) in files" :key="index" class="upload-modal__file">
            <AppIcon name="image" :size="20" />
            <span class="upload-modal__file-name">{{ file.name }}</span>
            <span class="upload-modal__file-size">{{ formatSize(file.size) }}</span>
            <AppButton variant="ghost" size="sm" @click="removeFile(index)">
              <AppIcon name="x" :size="16" />
            </AppButton>
          </div>
        </div>

        <!-- Progress -->
        <div v-if="uploading" class="upload-modal__progress">
          <AppSpinner size="sm" />
          <span>Uploading...</span>
        </div>

        <!-- Actions -->
        <div class="upload-modal__actions">
          <AppButton variant="secondary" @click="emit('close')">
            Cancel
          </AppButton>
          <AppButton
            :disabled="!canUpload"
            :loading="uploading"
            @click="handleUpload"
          >
            Upload {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.upload-modal__overlay {
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

.upload-modal {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp var(--transition-normal);
}

.upload-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.upload-modal__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.upload-modal__folder-section {
  margin-bottom: var(--space-lg);
}

.upload-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.upload-modal__folder-row {
  display: flex;
  gap: var(--space-sm);
}

.upload-modal__folder-select {
  flex: 1;
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

.upload-modal__add-folder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-surface, #1a1a1a);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.upload-modal__add-folder-btn:hover {
  background: var(--color-surface-elevated, #2a2a2a);
  border-color: var(--color-primary);
}

.upload-modal__folder-select option {
  background: var(--color-surface, #1a1a1a);
  color: var(--color-text-primary);
  padding: 8px;
}

.upload-modal__folder-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.upload-modal__new-folder {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.upload-modal__new-folder-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.upload-modal__new-folder-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.upload-modal__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  padding: var(--space-2xl) var(--space-xl);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-modal__dropzone:hover,
.upload-modal__dropzone--active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.upload-modal__input {
  display: none;
}

.upload-modal__icon {
  margin-bottom: var(--space-md);
  color: var(--color-text-muted);
}

.upload-modal__dropzone-text {
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.upload-modal__link {
  color: var(--color-primary);
  text-decoration: underline;
}

.upload-modal__dropzone-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.upload-modal__files {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-height: 150px;
  overflow-y: auto;
}

.upload-modal__file {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.upload-modal__file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.upload-modal__file-size {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.upload-modal__progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  color: var(--color-text-secondary);
}

.upload-modal__actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-lg);
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
