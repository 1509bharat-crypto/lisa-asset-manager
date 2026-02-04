<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error'
}

withDefaults(defineProps<Props>(), {
  variant: 'default'
})
</script>

<template>
  <span :class="['app-badge', `app-badge--${variant}`]">
    <slot />
  </span>
</template>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
}

.app-badge--default {
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
}

.app-badge--success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.app-badge--warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.app-badge--error {
  background: var(--color-error-light);
  color: var(--color-error);
}
</style>
