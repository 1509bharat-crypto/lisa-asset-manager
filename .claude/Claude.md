# CLAUDE.md - Asset Library Development Guide

> This document defines the architecture, patterns, and components for the Asset Library application.

---

## 1. Project Overview

Asset Library is a shared image asset management system that allows teams to upload, organize, and access images from anywhere - including via a Figma plugin.

**Key Features:**
- Project-based organization with color coding
- Nested folder hierarchy
- Image upload with drag & drop
- Search and filtering
- Figma plugin integration
- AI-powered image tagging (OpenAI Vision)

---

## 2. Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Node.js + TypeScript | API server |
| **Database** | PostgreSQL (Railway) | Data persistence |
| **Frontend** | Vue 3 + TypeScript | SPA with components |
| **Build** | Vite | Dev server & bundling |
| **Styling** | CSS Variables + Scoped | Design system |
| **Deployment** | Railway | Hosting |

### 2.2 Directory Structure

```
asset-library/
├── src/
│   ├── server/                 # Backend
│   │   ├── server.ts           # HTTP server & routes
│   │   ├── types.ts            # Shared types
│   │   └── validation.ts       # Input validation
│   │
│   └── client/                 # Frontend (Vue 3)
│       ├── components/
│       │   ├── atoms/          # Basic building blocks
│       │   ├── molecules/      # Combinations of atoms
│       │   └── organisms/      # Complex components
│       ├── views/              # Page components
│       ├── composables/        # Reusable logic (useX)
│       ├── services/           # API client
│       ├── types/              # Frontend types
│       ├── styles/             # Global styles & variables
│       ├── App.vue             # Root component
│       └── main.ts             # Entry point
│
├── figma-plugin/               # Figma plugin
├── scripts/                    # DB setup scripts
├── dist/                       # Built frontend
├── dist-server/                # Built backend
└── public/                     # Static assets
```

---

## 3. Design System

### 3.1 Color Palette

```css
:root {
  /* Primary */
  --color-primary: #667eea;
  --color-primary-hover: #5a6fd6;
  --color-primary-light: rgba(102, 126, 234, 0.1);

  /* Background */
  --color-bg: #0a0a0f;
  --color-bg-card: #12121a;
  --color-bg-elevated: #1a1a24;
  --color-bg-input: #1e1e2a;

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #6b6b7b;

  /* Border */
  --color-border: #2a2a3a;
  --color-border-hover: #3a3a4a;

  /* Status */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
}
```

### 3.2 Typography

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --font-size-2xl: 32px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

---

## 4. Component Architecture (Atomic Design)

### 4.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ VIEWS (src/client/views/)                                       │
│ • Full pages, handle routing and data fetching                  │
│ • Examples: ProjectsView, AssetsView                            │
└─────────────────────────────────────────────────────────────────┘
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORGANISMS (src/client/components/organisms/)                    │
│ • Complex, self-contained UI sections                           │
│ • CAN use composables and make API calls                        │
│ • Examples: ProjectCard, AssetGrid, UploadModal, FolderTree     │
└─────────────────────────────────────────────────────────────────┘
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ MOLECULES (src/client/components/molecules/)                    │
│ • Combinations of atoms with specific purpose                   │
│ • CANNOT make API calls                                         │
│ • Examples: SearchBar, StatCard, FolderChip, ColorPicker        │
└─────────────────────────────────────────────────────────────────┘
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ATOMS (src/client/components/atoms/)                            │
│ • Smallest building blocks, pure styled components              │
│ • CANNOT use composables or make API calls                      │
│ • Examples: AppButton, AppInput, AppCard, AppSpinner, AppIcon   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Rules

| Level | API Calls | Composables | Can Import |
|-------|-----------|-------------|------------|
| **Atoms** | Never | None | Nothing |
| **Molecules** | Never | Never | Atoms |
| **Organisms** | Yes (via composables) | Yes | Atoms, Molecules |
| **Views** | Yes | Yes | Everything |

---

## 5. Components Specification

### 5.1 Atoms

#### AppButton
```vue
<!-- components/atoms/AppButton.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}
</script>
```

#### AppInput
```vue
<!-- components/atoms/AppInput.vue -->
<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  type?: 'text' | 'search' | 'email'
  disabled?: boolean
  error?: boolean
}
</script>
```

#### AppCard
```vue
<!-- components/atoms/AppCard.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'default' | 'elevated' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
}
</script>
```

#### AppSpinner
```vue
<!-- components/atoms/AppSpinner.vue -->
<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}
</script>
```

#### AppIcon
```vue
<!-- components/atoms/AppIcon.vue -->
<script setup lang="ts">
interface Props {
  name: 'folder' | 'image' | 'upload' | 'search' | 'trash' | 'plus' | 'back' | 'check' | 'x'
  size?: number
}
</script>
```

#### AppBadge
```vue
<!-- components/atoms/AppBadge.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error'
}
</script>
```

### 5.2 Molecules

#### SearchBar
```vue
<!-- components/molecules/SearchBar.vue -->
<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
}
// Uses: AppInput, AppIcon
</script>
```

#### StatCard
```vue
<!-- components/molecules/StatCard.vue -->
<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  icon: string
}
// Uses: AppCard, AppIcon
</script>
```

#### FolderChip
```vue
<!-- components/molecules/FolderChip.vue -->
<script setup lang="ts">
interface Props {
  name: string
  active?: boolean
  hasChildren?: boolean
  deletable?: boolean
}
// Emits: click, delete
// Uses: AppIcon
</script>
```

#### ColorPicker
```vue
<!-- components/molecules/ColorPicker.vue -->
<script setup lang="ts">
interface Props {
  modelValue: string
  colors?: string[]
}
// Preset colors for project selection
</script>
```

#### ConfirmDialog
```vue
<!-- components/molecules/ConfirmDialog.vue -->
<script setup lang="ts">
interface Props {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}
// Emits: confirm, cancel
// Uses: AppButton, AppCard
</script>
```

### 5.3 Organisms

#### ProjectCard
```vue
<!-- components/organisms/ProjectCard.vue -->
<script setup lang="ts">
interface Props {
  project: Project
  assetCount: number
  folderCount: number
}
// Emits: click, delete
// Uses: AppCard, AppIcon, AppButton
</script>
```

#### AssetGrid
```vue
<!-- components/organisms/AssetGrid.vue -->
<script setup lang="ts">
interface Props {
  assets: Asset[]
  loading?: boolean
  selectable?: boolean
}
// Emits: select, delete, preview
// Uses: AppCard, AppSpinner, AppIcon
</script>
```

#### AssetCard
```vue
<!-- components/organisms/AssetCard.vue -->
<script setup lang="ts">
interface Props {
  asset: Asset
  selected?: boolean
  showFolder?: boolean
}
// Emits: click, select, delete
// Uses: AppCard, AppIcon, FolderChip
</script>
```

#### FolderTree
```vue
<!-- components/organisms/FolderTree.vue -->
<script setup lang="ts">
interface Props {
  folders: Folder[]
  selectedId: string | null
  projectId: string
}
// Emits: select, create, delete
// Uses: FolderChip, AppButton, AppIcon
</script>
```

#### UploadModal
```vue
<!-- components/organisms/UploadModal.vue -->
<script setup lang="ts">
interface Props {
  projectId: string
  folderId?: string
}
// Emits: close, uploaded
// Uses: AppButton, AppCard, AppSpinner, AppIcon
// Features: drag & drop, multiple files, progress
</script>
```

#### CreateProjectModal
```vue
<!-- components/organisms/CreateProjectModal.vue -->
<script setup lang="ts">
// Emits: close, created
// Uses: AppInput, AppButton, ColorPicker, AppCard
</script>
```

#### CreateFolderModal
```vue
<!-- components/organisms/CreateFolderModal.vue -->
<script setup lang="ts">
interface Props {
  projectId: string
  parentId?: string
}
// Emits: close, created
// Uses: AppInput, AppButton, AppCard
</script>
```

#### AssetPreviewModal
```vue
<!-- components/organisms/AssetPreviewModal.vue -->
<script setup lang="ts">
interface Props {
  asset: Asset
}
// Emits: close, delete, download
// Uses: AppButton, AppIcon
// Features: full-size preview, metadata, copy to clipboard
</script>
```

#### AppHeader
```vue
<!-- components/organisms/AppHeader.vue -->
<script setup lang="ts">
interface Props {
  title: string
  showBack?: boolean
  projectColor?: string
}
// Emits: back
// Uses: AppButton, AppIcon, SearchBar, StatCard
</script>
```

### 5.4 Views

#### ProjectsView
```vue
<!-- views/ProjectsView.vue -->
<script setup lang="ts">
// Main dashboard showing all projects
// Uses: AppHeader, ProjectCard, CreateProjectModal, SearchBar
// Composables: useProjects
</script>
```

#### AssetsView
```vue
<!-- views/AssetsView.vue -->
<script setup lang="ts">
// Shows assets for a single project
// Uses: AppHeader, AssetGrid, FolderTree, UploadModal, CreateFolderModal
// Composables: useAssets, useFolders
</script>
```

---

## 6. Composables

### 6.1 useProjects
```typescript
// composables/useProjects.ts
export function useProjects() {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects(): Promise<void>
  async function createProject(data: CreateProjectInput): Promise<Project>
  async function deleteProject(id: string): Promise<void>

  return { projects, loading, error, fetchProjects, createProject, deleteProject }
}
```

### 6.2 useAssets
```typescript
// composables/useAssets.ts
export function useAssets(projectId: Ref<string>) {
  const assets = ref<Asset[]>([])
  const loading = ref(false)

  async function fetchAssets(): Promise<void>
  async function uploadAsset(file: File, folderId?: string): Promise<Asset>
  async function deleteAsset(id: string): Promise<void>
  async function bulkDelete(ids: string[]): Promise<void>

  return { assets, loading, fetchAssets, uploadAsset, deleteAsset, bulkDelete }
}
```

### 6.3 useFolders
```typescript
// composables/useFolders.ts
export function useFolders(projectId: Ref<string>) {
  const folders = ref<Folder[]>([])

  async function fetchFolders(): Promise<void>
  async function createFolder(name: string, parentId?: string): Promise<Folder>
  async function deleteFolder(id: string): Promise<void>

  // Computed: folderTree (nested structure)

  return { folders, folderTree, fetchFolders, createFolder, deleteFolder }
}
```

### 6.4 useToast
```typescript
// composables/useToast.ts
export function useToast() {
  function success(message: string): void
  function error(message: string): void
  function warning(message: string): void

  return { success, error, warning }
}
```

---

## 7. API Service

```typescript
// services/api.ts
const API_BASE = ''  // Same origin

export const api = {
  // Projects
  getProjects: () => get<Project[]>('/api/projects'),
  createProject: (data: CreateProjectInput) => post<Project>('/api/projects', data),
  deleteProject: (id: string) => del(`/api/projects/${id}`),

  // Folders
  getFolders: (projectId?: string) => get<Folder[]>('/api/folders', { project_id: projectId }),
  createFolder: (data: CreateFolderInput) => post<Folder>('/api/folders', data),
  deleteFolder: (id: string) => del(`/api/folders/${id}`),

  // Assets
  getAssets: (projectId?: string) => get<Asset[]>('/api/assets', { project_id: projectId }),
  createAsset: (data: CreateAssetInput) => post<Asset>('/api/assets', data),
  deleteAsset: (id: string) => del(`/api/assets/${id}`),
  bulkDeleteAssets: (ids: string[]) => post('/api/assets/bulk-delete', { ids }),

  // Storage
  getStorageInfo: () => get<StorageInfo>('/api/storage'),

  // AI
  analyzeImage: (imageData: string) => post<ImageAnalysis>('/api/analyze-image', { imageData }),
}
```

---

## 8. Types

```typescript
// types/index.ts

export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

export interface Folder {
  id: string
  name: string
  project_id: string
  parent_id: string | null
  created_at: string
}

export interface Asset {
  id: string
  name: string
  type: string
  size: number
  data: string  // base64
  project_id: string
  folder_id: string | null
  upload_date: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
}

export interface CreateFolderInput {
  name: string
  project_id: string
  parent_id?: string
}

export interface CreateAssetInput {
  name: string
  type: string
  size: number
  data: string
  project_id: string
  folder_id?: string
}

export interface StorageInfo {
  total_assets: number
  total_size: number
  by_type: Record<string, { count: number; size: number }>
}
```

---

## 9. Development Commands

```bash
# Install dependencies
npm install

# Development (frontend only - uses Vite dev server)
npm run dev

# Development (backend with hot reload)
npm run dev:server

# Build everything
npm run build

# Type check
npm run typecheck

# Start production server
npm start
```

---

## 10. Git Workflow

```
master        - Production (auto-deploys to Railway)
development   - Experimentation and feature development
```

**Process:**
1. Work on `development` branch
2. Test locally
3. Merge to `master` when ready
4. Railway auto-deploys from `master`

---

## 11. Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...

# Optional
PORT=8080
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.railway.app
OPENAI_API_KEY=sk-...  # For AI tagging
```

---

## Quick Reference

### Component Checklist
- [ ] Uses `<script setup lang="ts">`
- [ ] Props typed with `defineProps<Props>()`
- [ ] Events typed with `defineEmits<Events>()`
- [ ] Uses CSS variables from design system
- [ ] Follows atomic design level rules
- [ ] No hardcoded colors or sizes

### Security Checklist
- [ ] User input sanitized (textContent, not innerHTML)
- [ ] UUIDs validated before database queries
- [ ] File uploads validated (type, size)
- [ ] No sensitive data in logs

---

_This document is the source of truth for Asset Library development._
