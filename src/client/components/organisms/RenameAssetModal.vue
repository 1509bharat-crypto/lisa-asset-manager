<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, AppCard, AppInput } from '../atoms'
import type { Asset } from '../../types'

const props = defineProps<{
  asset: Asset
}>()

const emit = defineEmits<{
  close: []
  rename: [newName: string]
}>()

const name = ref('')
const loading = ref(false)

// Get the file extension
const fileExtension = computed(() => {
  const parts = props.asset.name.split('.')
  return parts.length > 1 ? `.${parts.pop()}` : ''
})

// Get the filename without extension
const filenameWithoutExt = computed(() => {
  const ext = fileExtension.value
  if (ext) {
    return props.asset.name.slice(0, -ext.length)
  }
  return props.asset.name
})

onMounted(() => {
  name.value = filenameWithoutExt.value
})

const handleSubmit = () => {
  if (!name.value.trim()) return

  loading.value = true
  const newName = name.value.trim() + fileExtension.value
  emit('rename', newName)
}
</script>

<template>
  <Teleport to="body">
    <div class="rename-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="rename-modal">
        <h2 class="rename-modal__title">Rename Asset</h2>

        <form @submit.prevent="handleSubmit">
          <div class="rename-modal__field">
            <label class="rename-modal__label">File Name</label>
            <div class="rename-modal__input-wrapper">
              <AppInput
                v-model="name"
                placeholder="Enter file name"
                autofocus
              />
              <span class="rename-modal__extension">{{ fileExtension }}</span>
            </div>
          </div>

          <div class="rename-modal__actions">
            <AppButton variant="secondary" type="button" @click="emit('close')">
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              :disabled="!name.trim() || name.trim() === filenameWithoutExt"
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
.rename-modal__overlay {
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

.rename-modal {
  width: 100%;
  max-width: 400px;
  animation: slideUp var(--transition-normal);
}

.rename-modal__title {
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.rename-modal__field {
  margin-bottom: var(--space-md);
}

.rename-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.rename-modal__input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.rename-modal__input-wrapper :deep(.app-input) {
  flex: 1;
}

.rename-modal__extension {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 0 var(--space-sm);
}

.rename-modal__actions {
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
