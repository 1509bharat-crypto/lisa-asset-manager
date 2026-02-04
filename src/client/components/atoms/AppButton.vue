<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :type="type"
    :class="[
      'app-button',
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'app-button--full-width': fullWidth, 'app-button--loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="app-button__spinner"></span>
    <span class="app-button__content" :class="{ 'app-button__content--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-family: var(--font-family);
  font-weight: var(--font-weight-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.app-button--primary {
  background: var(--color-primary);
  color: white;
}

.app-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.app-button--secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-hover);
}

.app-button--ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.app-button--ghost:hover:not(:disabled) {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.app-button--danger {
  background: var(--color-error);
  color: white;
}

.app-button--danger:hover:not(:disabled) {
  background: #dc2626;
}

/* Sizes */
.app-button--sm {
  height: 32px;
  padding: 0 var(--space-md);
  font-size: var(--font-size-sm);
}

.app-button--md {
  height: 40px;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-sm);
}

.app-button--lg {
  height: 48px;
  padding: 0 var(--space-xl);
  font-size: var(--font-size-md);
}

/* Full width */
.app-button--full-width {
  width: 100%;
}

/* Loading spinner */
.app-button__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  position: absolute;
}

.app-button__content--hidden {
  visibility: hidden;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
