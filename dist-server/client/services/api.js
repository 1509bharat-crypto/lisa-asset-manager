"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const API_BASE = '/api';
async function request(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const data = await response.json();
        if (!response.ok) {
            return { error: data.error || `Request failed with status ${response.status}` };
        }
        return { data };
    }
    catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}
exports.api = {
    // Projects
    async getProjects() {
        return request('/projects');
    },
    async getProject(id) {
        return request(`/projects/${id}`);
    },
    async createProject(data) {
        return request('/projects', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    async updateProject(id, data) {
        return request(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    async deleteProject(id) {
        return request(`/projects/${id}`, {
            method: 'DELETE'
        });
    },
    // Assets
    async getAssets(projectId, folder) {
        const params = new URLSearchParams();
        if (folder)
            params.set('folder', folder);
        const query = params.toString();
        return request(`/projects/${projectId}/assets${query ? `?${query}` : ''}`);
    },
    async uploadAsset(projectId, file, folders = [], onProgress) {
        return new Promise((resolve) => {
            const formData = new FormData();
            formData.append('file', file);
            if (folders.length > 0) {
                formData.append('folders', JSON.stringify(folders));
            }
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            });
            xhr.addEventListener('load', () => {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({ data });
                    }
                    else {
                        resolve({ error: data.error || 'Upload failed' });
                    }
                }
                catch {
                    resolve({ error: 'Invalid response' });
                }
            });
            xhr.addEventListener('error', () => {
                resolve({ error: 'Network error' });
            });
            xhr.open('POST', `${API_BASE}/projects/${projectId}/assets`);
            xhr.send(formData);
        });
    },
    async deleteAsset(id) {
        return request(`/assets/${id}`, {
            method: 'DELETE'
        });
    },
    async deleteAssets(ids) {
        return request('/assets', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
    },
    async updateAssetFolders(id, folders) {
        return request(`/assets/${id}/folders`, {
            method: 'PATCH',
            body: JSON.stringify({ folders })
        });
    },
    async searchAssets(projectId, query) {
        const params = new URLSearchParams({ q: query });
        return request(`/projects/${projectId}/assets/search?${params.toString()}`);
    },
    // Folders
    async getFolders(projectId) {
        return request(`/projects/${projectId}/folders`);
    },
    async createFolder(projectId, name) {
        return request(`/projects/${projectId}/folders`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    },
    async deleteFolder(projectId, name) {
        return request(`/projects/${projectId}/folders/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
    }
};
//# sourceMappingURL=api.js.map