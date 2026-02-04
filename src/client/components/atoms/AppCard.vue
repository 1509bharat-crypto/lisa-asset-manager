<script setup lang="ts">
interface Props {
  variant?: 'default' | 'elevated' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  clickable: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<template>
  <div
    :class="[
      'app-card',
      `app-card--${variant}`,
      `app-card--padding-${padding}`,
      { 'app-card--clickable': clickable }
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <slot />
  </div>
</template>

<style scoped>
.app-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

/* Variants */
.app-card--default {
  border: 1px solid var(--color-border);
}

.app-card--elevated {
  box-shadow: var(--shadow-md);
}

.app-card--bordered {
  border: 2px solid var(--color-border);
}

/* Padding */
.app-card--padding-none {
  padding: 0;
}

.app-card--padding-sm {
  padding: var(--space-sm);
}

.app-card--padding-md {
  padding: var(--space-md);
}

.app-card--padding-lg {
  padding: var(--space-lg);
}

/* Clickable */
.app-card--clickable {
  cursor: pointer;
}

.app-card--clickable:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

.app-card--clickable:active {
  transform: translateY(0);
}
</style>
