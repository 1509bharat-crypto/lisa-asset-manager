<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})
</script>

<template>
  <div :class="['app-spinner', `app-spinner--${size}`]">
    <div class="app-spinner__circle"></div>
  </div>
</template>

<style scoped>
.app-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-spinner__circle {
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Sizes */
.app-spinner--sm .app-spinner__circle {
  width: 16px;
  height: 16px;
}

.app-spinner--md .app-spinner__circle {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

.app-spinner--lg .app-spinner__circle {
  width: 40px;
  height: 40px;
  border-width: 4px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
