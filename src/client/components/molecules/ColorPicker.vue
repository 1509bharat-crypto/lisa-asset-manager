<script setup lang="ts">
import { AppIcon } from '../atoms'

interface Props {
  modelValue: string
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => [
    '#667eea', // Primary blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#6366f1', // Indigo
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="color-picker">
    <button
      v-for="color in colors"
      :key="color"
      :class="['color-picker__swatch', { 'color-picker__swatch--selected': modelValue === color }]"
      :style="{ backgroundColor: color }"
      @click="emit('update:modelValue', color)"
    >
      <AppIcon v-if="modelValue === color" name="check" :size="14" class="color-picker__check" />
    </button>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.color-picker__swatch {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-picker__swatch:hover {
  transform: scale(1.1);
}

.color-picker__swatch--selected {
  border-color: white;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px currentColor;
}

.color-picker__check {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
</style>
