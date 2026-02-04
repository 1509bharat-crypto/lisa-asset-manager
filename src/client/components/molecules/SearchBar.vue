<script setup lang="ts">
import { AppInput, AppIcon } from '../atoms'

interface Props {
  modelValue: string
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="search-bar">
    <AppIcon name="search" :size="18" class="search-bar__icon" />
    <AppInput
      :model-value="modelValue"
      :placeholder="placeholder"
      type="search"
      class="search-bar__input"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-bar__icon {
  position: absolute;
  left: var(--space-md);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-bar__input {
  padding-left: 44px;
}

/* Override input styles for search */
.search-bar__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}
</style>
