<script setup lang="ts">
import {
  Folder,
  FolderPlus,
  Image,
  Upload,
  Search,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  Home,
  Download,
  Copy,
  Pencil,
  Database,
  AlertTriangle,
  Info,
  MoreVertical,
  Grid2x2,
  Grid3x3
} from 'lucide-vue-next'

type IconName =
  | 'folder'
  | 'folder-plus'
  | 'image'
  | 'upload'
  | 'search'
  | 'trash'
  | 'plus'
  | 'minus'
  | 'back'
  | 'check'
  | 'x'
  | 'chevron-right'
  | 'home'
  | 'download'
  | 'copy'
  | 'edit'
  | 'storage'
  | 'warning'
  | 'info'
  | 'more-vertical'
  | 'grid-small'
  | 'grid-large'

interface Props {
  name: IconName
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 20
})

const iconMap = {
  folder: Folder,
  'folder-plus': FolderPlus,
  image: Image,
  upload: Upload,
  search: Search,
  trash: Trash2,
  plus: Plus,
  minus: Minus,
  back: ArrowLeft,
  check: Check,
  x: X,
  'chevron-right': ChevronRight,
  home: Home,
  download: Download,
  copy: Copy,
  edit: Pencil,
  storage: Database,
  warning: AlertTriangle,
  info: Info,
  'more-vertical': MoreVertical,
  'grid-small': Grid3x3,
  'grid-large': Grid2x2
}
</script>

<template>
  <component
    :is="iconMap[name]"
    class="app-icon"
    :size="size"
    stroke-width="2"
  />
</template>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
