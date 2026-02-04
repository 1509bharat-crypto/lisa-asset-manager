<script setup lang="ts">
import { AppIcon } from '../atoms'

type IconName = 'folder' | 'image' | 'upload' | 'home'

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
      <AppIcon :name="icon" :size="20" />
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
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  color: var(--color-primary);
}

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
