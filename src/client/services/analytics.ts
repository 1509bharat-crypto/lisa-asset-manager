// Simple analytics service - tracks events to our own database

const SESSION_KEY = 'analytics_session_id'

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

async function track(event: string, properties?: Record<string, unknown>) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        properties,
        session_id: getSessionId(),
        url: window.location.pathname
      })
    })
  } catch (e) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Analytics track failed:', e)
  }
}

export const analytics = {
  track,

  // Pre-defined events
  projectCreated: (projectName: string) =>
    track('project_created', { project_name: projectName }),

  projectOpened: (projectId: string, projectName: string) =>
    track('project_opened', { project_id: projectId, project_name: projectName }),

  projectDeleted: (projectId: string) =>
    track('project_deleted', { project_id: projectId }),

  projectRenamed: (projectId: string, newName: string) =>
    track('project_renamed', { project_id: projectId, new_name: newName }),

  assetUploaded: (count: number, projectId: string) =>
    track('asset_uploaded', { count, project_id: projectId }),

  assetDownloaded: (assetId: string, assetName: string) =>
    track('asset_downloaded', { asset_id: assetId, asset_name: assetName }),

  assetDeleted: (count: number) =>
    track('asset_deleted', { count }),

  folderCreated: (projectId: string) =>
    track('folder_created', { project_id: projectId }),

  iconGenerated: (subject: string) =>
    track('icon_generated', { subject }),

  iconAdded: (subject: string) =>
    track('icon_added', { subject }),

  bulkDownload: (count: number) =>
    track('bulk_download', { count }),

  bulkDelete: (count: number) =>
    track('bulk_delete', { count }),

  pageView: (path: string) =>
    track('page_view', { path })
}
