<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AppButton, AppCard, AppInput } from '../atoms'
import { ColorPicker } from '../molecules'
import type { Project } from '../../types'

interface Props {
  project: Project
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [data: { name: string; description: string; color: string }]
}>()

const name = ref('')
const description = ref('')
const color = ref('#667eea')
const loading = ref(false)

onMounted(() => {
  name.value = props.project.name
  description.value = props.project.description || ''
  color.value = props.project.color || '#667eea'
})

const handleSubmit = () => {
  if (!name.value.trim()) return

  loading.value = true
  emit('save', {
    name: name.value.trim(),
    description: description.value.trim(),
    color: color.value
  })
}
</script>

<template>
  <Teleport to="body">
    <div class="edit-project-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="edit-project-modal">
        <h2 class="edit-project-modal__title">Edit Project</h2>

        <form @submit.prevent="handleSubmit">
          <div class="edit-project-modal__field">
            <label class="edit-project-modal__label">Project Name *</label>
            <AppInput
              v-model="name"
              placeholder="Enter project name"
              autofocus
            />
          </div>

          <div class="edit-project-modal__field">
            <label class="edit-project-modal__label">Description</label>
            <AppInput
              v-model="description"
              placeholder="Optional description"
            />
          </div>

          <div class="edit-project-modal__field">
            <label class="edit-project-modal__label">Color</label>
            <ColorPicker v-model="color" />
          </div>

          <div class="edit-project-modal__preview">
            <div class="edit-project-modal__preview-badge" :style="{ background: color }"></div>
            <span>{{ name || 'Project Preview' }}</span>
          </div>

          <div class="edit-project-modal__actions">
            <AppButton variant="secondary" type="button" @click="emit('close')">
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              :disabled="!name.trim()"
              :loading="loading"
            >
              Save Changes
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.edit-project-modal__overlay {
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

.edit-project-modal {
  width: 100%;
  max-width: 450px;
  animation: slideUp var(--transition-normal);
}

.edit-project-modal__title {
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.edit-project-modal__field {
  margin-bottom: var(--space-md);
}

.edit-project-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.edit-project-modal__preview {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  margin-top: var(--space-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.edit-project-modal__preview-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.edit-project-modal__actions {
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
