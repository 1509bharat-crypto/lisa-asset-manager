<script setup lang="ts">
import { AppIcon } from '../atoms'

type IconName = 'folder' | 'image' | 'upload' | 'home' | 'storage'

interface Props {
  label: string
  value: string | number
  icon: IconName
}

defineProps<Props>()
</script>

<template>
  <div class="stat-card">
    <div class="stat-card__icon">
      <AppIcon :name="icon" :size="24" />
    </div>
    <div class="stat-card__content">
      <div class="stat-card__value">{{ value }}</div>
      <div class="stat-card__label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--accent-color);
}

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
