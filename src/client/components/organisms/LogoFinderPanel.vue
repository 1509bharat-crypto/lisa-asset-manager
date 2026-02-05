<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, AppSpinner, AppIcon } from '../atoms'

const emit = defineEmits<{
  close: []
  add: [logos: { dataUrl: string; brandName: string }[]]
}>()

const saving = ref(false)
const iconSubject = ref('')
const isGenerating = ref(false)
const generatedIcon = ref<{ dataUrl: string; subject: string } | null>(null)
const error = ref<string | null>(null)

const canGenerate = computed(() => iconSubject.value.trim() && !isGenerating.value)
const canAdd = computed(() => generatedIcon.value && !saving.value && !isGenerating.value)

async function generateIcon() {
  const subject = iconSubject.value.trim()
  if (!subject || isGenerating.value) return

  isGenerating.value = true
  error.value = null
  generatedIcon.value = null

  try {
    const response = await fetch('/api/generate-icon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject })
    })

    const data = await response.json()

    if (data.error) {
      error.value = data.error
    } else if (data.data) {
      generatedIcon.value = { dataUrl: data.data, subject }
    }
  } catch (e) {
    console.error('Failed to generate icon:', e)
    error.value = 'Generation failed'
  } finally {
    isGenerating.value = false
  }
}

async function handleAdd() {
  if (!generatedIcon.value) return

  saving.value = true
  emit('add', [{
    dataUrl: generatedIcon.value.dataUrl,
    brandName: generatedIcon.value.subject
  }])

  // Clear after adding
  generatedIcon.value = null
  iconSubject.value = ''
  saving.value = false
}
</script>

<template>
  <div class="logo-panel">
    <!-- Header -->
    <div class="logo-panel__header">
      <h3 class="logo-panel__title">Generate Icon</h3>
      <AppButton variant="ghost" size="sm" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </AppButton>
    </div>

    <!-- Input Section -->
    <div class="logo-panel__input-section">
      <input
        v-model="iconSubject"
        class="logo-panel__input"
        placeholder="Enter icon subject..."
        :disabled="isGenerating"
        @keydown.enter="generateIcon"
      />
      <AppButton
        @click="generateIcon"
        :disabled="!canGenerate"
        :loading="isGenerating"
        class="logo-panel__generate-btn"
      >
        <AppIcon v-if="!isGenerating" name="plus" :size="16" />
        {{ isGenerating ? 'Generating...' : 'Generate' }}
      </AppButton>
      <p class="logo-panel__hint">e.g., shopping cart, bell, user profile</p>
    </div>

    <!-- Preview Area -->
    <div class="logo-panel__preview-area">
      <!-- Loading state -->
      <div v-if="isGenerating" class="logo-panel__loading">
        <AppSpinner size="lg" />
        <p>Generating icon...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="logo-panel__error-state">
        <AppIcon name="alert-circle" :size="32" />
        <p>{{ error }}</p>
        <AppButton variant="secondary" size="sm" @click="generateIcon">
          <AppIcon name="refresh" :size="14" />
          Try Again
        </AppButton>
      </div>

      <!-- Generated icon -->
      <div v-else-if="generatedIcon" class="logo-panel__result">
        <div class="logo-panel__preview">
          <img :src="generatedIcon.dataUrl" :alt="generatedIcon.subject" />
        </div>
        <div class="logo-panel__result-name">{{ generatedIcon.subject }}</div>
        <div class="logo-panel__result-actions">
          <AppButton variant="secondary" size="sm" @click="generateIcon">
            <AppIcon name="refresh" :size="14" />
            Regenerate
          </AppButton>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="logo-panel__empty">
        <AppIcon name="image" :size="32" />
        <p>Generate flat vector icons with AI</p>
        <p class="logo-panel__empty-hint">Grey tones, no gradients, transparent BG</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="logo-panel__footer">
      <AppButton
        :disabled="!canAdd"
        :loading="saving"
        @click="handleAdd"
        class="logo-panel__add-btn"
      >
        <AppIcon name="plus" :size="16" />
        Add to Project
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.logo-panel {
  width: 340px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logo-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.logo-panel__input-section {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.logo-panel__input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.logo-panel__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.logo-panel__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logo-panel__generate-btn {
  width: 100%;
}

.logo-panel__hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0;
}

.logo-panel__preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  overflow-y: auto;
}

.logo-panel__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-text-muted);
}

.logo-panel__loading p {
  margin: 0;
  font-size: var(--font-size-sm);
}

.logo-panel__error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-error);
  text-align: center;
}

.logo-panel__error-state p {
  margin: 0;
  font-size: var(--font-size-sm);
}

.logo-panel__result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
}

.logo-panel__preview {
  width: 200px;
  height: 136px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.logo-panel__preview img {
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
}

.logo-panel__result-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.logo-panel__result-actions {
  display: flex;
  gap: var(--space-sm);
}

.logo-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  color: var(--color-text-muted);
  gap: var(--space-sm);
  text-align: center;
}

.logo-panel__empty p {
  font-size: var(--font-size-sm);
  margin: 0;
}

.logo-panel__empty-hint {
  font-size: 12px !important;
  opacity: 0.7;
}

.logo-panel__footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.logo-panel__add-btn {
  width: 100%;
}
</style>
