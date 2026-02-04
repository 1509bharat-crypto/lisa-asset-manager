<script setup lang="ts">
import { ref } from 'vue'
import { AppButton, AppCard, AppInput } from '../atoms'
import { ColorPicker } from '../molecules'

const emit = defineEmits<{
  close: []
  create: [data: { name: string; description: string; color: string }]
}>()

const name = ref('')
const description = ref('')
const color = ref('#667eea')
const loading = ref(false)

const handleSubmit = () => {
  if (!name.value.trim()) return

  loading.value = true
  emit('create', {
    name: name.value.trim(),
    description: description.value.trim(),
    color: color.value
  })
}
</script>

<template>
  <Teleport to="body">
    <div class="create-project-modal__overlay" @click.self="emit('close')">
      <AppCard variant="elevated" padding="lg" class="create-project-modal">
        <h2 class="create-project-modal__title">Create New Project</h2>

        <form @submit.prevent="handleSubmit">
          <div class="create-project-modal__field">
            <label class="create-project-modal__label">Project Name *</label>
            <AppInput
              v-model="name"
              placeholder="Enter project name"
              autofocus
            />
          </div>

          <div class="create-project-modal__field">
            <label class="create-project-modal__label">Description</label>
            <AppInput
              v-model="description"
              placeholder="Optional description"
            />
          </div>

          <div class="create-project-modal__field">
            <label class="create-project-modal__label">Color</label>
            <ColorPicker v-model="color" />
          </div>

          <div class="create-project-modal__preview">
            <div class="create-project-modal__preview-badge" :style="{ background: color }"></div>
            <span>{{ name || 'Project Preview' }}</span>
          </div>

          <div class="create-project-modal__actions">
            <AppButton variant="secondary" type="button" @click="emit('close')">
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              :disabled="!name.trim()"
              :loading="loading"
            >
              Create Project
            </AppButton>
          </div>
        </form>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.create-project-modal__overlay {
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

.create-project-modal {
  width: 100%;
  max-width: 450px;
  animation: slideUp var(--transition-normal);
}

.create-project-modal__title {
  margin-bottom: var(--space-lg);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.create-project-modal__field {
  margin-bottom: var(--space-md);
}

.create-project-modal__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.create-project-modal__preview {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  margin-top: var(--space-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.create-project-modal__preview-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.create-project-modal__actions {
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
