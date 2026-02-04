<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AppButton, AppCard, AppInput } from '../atoms'
import type { Folder } from '../../types'

const props = defineProps<{
  folder: Folder
}>()

const emit = defineEmits<{
  close: []
  rename: [newName: string]
}>()

const name = ref('')
const loading = ref(false)

onMounted(() => {
  name.value = props.folder.name
})

const handleSubmit = () => {
  if (!name.value.trim()) return
  if (name.value.trim() === props.folder.name) {
    emit('close')
    return
  }

  loading.value = true
  emit('rename', name.value.trim())
}
</script>

<template>
  <Teleport to="body">
    <div class="rename-folder-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="rename-folder-modal">
        <h2 class="rename-folder-modal__title">Rename Folder</h2>

        <form @submit.prevent="handleSubmit">
          <div class="rename-folder-modal__field">
            <label class="rename-folder-modal__label">Folder Name</label>
            <AppInput
              v-model="name"
              placeholder="Enter folder name"
              autofocus
            />
          </div>

          <div class="rename-folder-modal__actions">
            <AppButton variant="secondary" type="button" @click="emit('close')">
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              :disabled="!name.trim() || name.trim() === folder.name"
              :loading="loading"
            >
              Rename
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.rename-folder-modal__overlay {
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

.rename-folder-modal {
  width: 100%;
  max-width: 400px;
  animation: slideUp var(--transition-normal);
}

.rename-folder-modal__title {
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.rename-folder-modal__field {
  margin-bottom: var(--space-md);
}

.rename-folder-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.rename-folder-modal__actions {
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
