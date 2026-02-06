import posthog from 'posthog-js'
import type { App } from 'vue'

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export function initPostHog() {
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured. Analytics disabled.')
    return false
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  })

  return true
}

export const posthogPlugin = {
  install(app: App) {
    const initialized = initPostHog()

    // Make posthog available globally
    app.config.globalProperties.$posthog = initialized ? posthog : null
    app.provide('posthog', initialized ? posthog : null)
  }
}

// Composable for using PostHog in components
export function useAnalytics() {
  const isEnabled = !!POSTHOG_KEY

  const track = (event: string, properties?: Record<string, unknown>) => {
    if (isEnabled && posthog) {
      posthog.capture(event, properties)
    }
  }

  // Pre-defined events for the Asset Library
  const events = {
    // Project events
    projectCreated: (projectName: string) =>
      track('project_created', { project_name: projectName }),

    projectOpened: (projectId: string, projectName: string) =>
      track('project_opened', { project_id: projectId, project_name: projectName }),

    projectDeleted: (projectId: string) =>
      track('project_deleted', { project_id: projectId }),

    projectRenamed: (projectId: string, newName: string) =>
      track('project_renamed', { project_id: projectId, new_name: newName }),

    // Asset events
    assetUploaded: (count: number, projectId: string) =>
      track('asset_uploaded', { count, project_id: projectId }),

    assetDownloaded: (assetId: string, assetName: string) =>
      track('asset_downloaded', { asset_id: assetId, asset_name: assetName }),

    assetDeleted: (count: number) =>
      track('asset_deleted', { count }),

    assetCopied: (assetId: string) =>
      track('asset_copied', { asset_id: assetId }),

    // Folder events
    folderCreated: (projectId: string) =>
      track('folder_created', { project_id: projectId }),

    // Icon generation
    iconGenerated: (subject: string) =>
      track('icon_generated', { subject }),

    iconAdded: (subject: string) =>
      track('icon_added', { subject }),

    // Search
    searchPerformed: (query: string, resultCount: number) =>
      track('search_performed', { query, result_count: resultCount }),

    // Bulk actions
    bulkDownload: (count: number) =>
      track('bulk_download', { count }),

    bulkDelete: (count: number) =>
      track('bulk_delete', { count }),
  }

  return {
    track,
    events,
    isEnabled,
    posthog: isEnabled ? posthog : null
  }
}

export { posthog }
