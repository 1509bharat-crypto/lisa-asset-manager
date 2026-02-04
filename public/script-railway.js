/**
 * Asset Library - Railway Version
 * Uses REST API instead of Supabase client
 */

// === API Configuration ===
const API_BASE = ''; // Same origin, empty string for relative URLs

// === Constants ===
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const POLLING_INTERVAL = 5000; // 5 seconds for change detection

// === XSS Protection ===
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// === State Management ===
let projects = [];
let folders = [];
let assets = [];
let assetCounts = {};
let searchQuery = '';
let currentProject = null;
let selectedFolder = 'all';
let currentParentFolder = null;
let selectedAssets = new Set();
let selectionMode = false;
let pendingFiles = [];
let selectedColor = '#667eea';
let pollingTimer = null;

// === API Helper Functions ===
async function api(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// === DOM Elements ===
const elements = {
    dashboardView: document.getElementById('dashboardView'),
    projectView: document.getElementById('projectView'),
    pageTitle: document.getElementById('pageTitle'),
    backToDashboard: document.getElementById('backToDashboard'),
    quickUploadBtn: document.getElementById('quickUploadBtn'),
    storageUsed: document.getElementById('storageUsed'),
    projectGrid: document.getElementById('projectGrid'),
    emptyProjects: document.getElementById('emptyProjects'),
    newProjectBtn: document.getElementById('newProjectBtn'),
    folderChips: document.getElementById('folderChips'),
    newFolderBtn: document.getElementById('newFolderBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    assetGrid: document.getElementById('assetGrid'),
    emptyAssets: document.getElementById('emptyAssets'),
    assetCount: document.getElementById('assetCount'),
    selectionModeBtn: document.getElementById('selectionModeBtn'),
    bulkActions: document.getElementById('bulkActions'),
    selectedCount: document.getElementById('selectedCount'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    deselectAllBtn: document.getElementById('deselectAllBtn'),
    bulkDownloadBtn: document.getElementById('bulkDownloadBtn'),
    bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
    cancelSelectionBtn: document.getElementById('cancelSelectionBtn'),
    projectModal: document.getElementById('projectModal'),
    projectNameInput: document.getElementById('projectNameInput'),
    projectDescInput: document.getElementById('projectDescInput'),
    createProjectBtn: document.getElementById('createProjectBtn'),
    cancelProjectBtn: document.getElementById('cancelProjectBtn'),
    folderModal: document.getElementById('folderModal'),
    folderNameInput: document.getElementById('folderNameInput'),
    createFolderBtn: document.getElementById('createFolderBtn'),
    cancelFolderBtn: document.getElementById('cancelFolderBtn'),
    uploadModal: document.getElementById('uploadModal'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    filePreview: document.getElementById('filePreview'),
    fileCount: document.getElementById('fileCount'),
    projectSelect: document.getElementById('projectSelect'),
    folderSelect: document.getElementById('folderSelect'),
    uploadFilesBtn: document.getElementById('uploadFilesBtn'),
    cancelUploadBtn: document.getElementById('cancelUploadBtn'),
    toast: document.getElementById('toast')
};

// === Initialize App ===
async function init() {
    showDashboardSkeletonLoading();
    attachEventListeners();

    await loadProjects();
    await loadFolders();
    await loadAssetCounts();

    renderDashboard();
    startPolling();
}

// === Polling for changes (replaces Supabase realtime) ===
function startPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(async () => {
        try {
            const newCounts = await api('/assets/counts');
            const countsChanged = JSON.stringify(newCounts) !== JSON.stringify(assetCounts);

            if (countsChanged) {
                assetCounts = newCounts;
                if (!currentProject) {
                    renderDashboard();
                }
            }

            if (currentProject) {
                // Reload current project's assets if viewing a project
                const oldAssetIds = assets.filter(a => a.project_id === currentProject.id).map(a => a.id).sort().join(',');
                await loadAssets(currentProject.id);
                const newAssetIds = assets.filter(a => a.project_id === currentProject.id).map(a => a.id).sort().join(',');

                if (oldAssetIds !== newAssetIds) {
                    renderAssets();
                    updateStorageInfo();
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, POLLING_INTERVAL);
}

function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

// === Event Listeners ===
function attachEventListeners() {
    elements.backToDashboard.addEventListener('click', showDashboard);
    elements.newProjectBtn.addEventListener('click', openProjectModal);
    elements.createProjectBtn.addEventListener('click', createProject);
    elements.cancelProjectBtn.addEventListener('click', closeProjectModal);
    elements.quickUploadBtn.addEventListener('click', openUploadModal);
    elements.browseFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelection);
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target === elements.uploadArea || e.target.closest('.upload-icon-small, .upload-text-small')) {
            elements.fileInput.click();
        }
    });
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.projectSelect.addEventListener('change', handleProjectSelection);
    elements.uploadFilesBtn.addEventListener('click', uploadFiles);
    elements.cancelUploadBtn.addEventListener('click', closeUploadModal);
    elements.newFolderBtn.addEventListener('click', openFolderModal);
    elements.createFolderBtn.addEventListener('click', createFolder);
    elements.cancelFolderBtn.addEventListener('click', closeFolderModal);
    elements.searchInput.addEventListener('input', handleSearch);
    elements.clearSearch.addEventListener('click', clearSearch);
    elements.selectionModeBtn.addEventListener('click', toggleSelectionMode);
    elements.selectAllBtn.addEventListener('click', selectAll);
    elements.deselectAllBtn.addEventListener('click', deselectAll);
    elements.bulkDownloadBtn.addEventListener('click', bulkDownload);
    elements.bulkDeleteBtn.addEventListener('click', bulkDelete);
    elements.cancelSelectionBtn.addEventListener('click', exitSelectionMode);

    elements.projectModal.addEventListener('click', (e) => {
        if (e.target === elements.projectModal) closeProjectModal();
    });
    elements.folderModal.addEventListener('click', (e) => {
        if (e.target === elements.folderModal) closeFolderModal();
    });
    elements.uploadModal.addEventListener('click', (e) => {
        if (e.target === elements.uploadModal) closeUploadModal();
    });

    elements.projectNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createProject();
    });
    elements.folderNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedColor = e.target.dataset.color;
        });
    });
}

// === Data Loading ===
async function loadProjects() {
    try {
        projects = await api('/projects');
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
        projects = [];
    }
}

async function loadFolders() {
    try {
        folders = await api('/folders');
    } catch (error) {
        console.error('Error loading folders:', error);
        showToast('Error loading folders', 'error');
        folders = [];
    }
}

async function loadAssetCounts() {
    try {
        assetCounts = await api('/assets/counts');
        const storage = await api('/assets/storage');
        elements.storageUsed.textContent = formatFileSize(storage.total_size);
    } catch (error) {
        console.error('Error loading asset counts:', error);
    }
}

async function loadAssets(projectId = null) {
    try {
        const endpoint = projectId ? `/assets?project_id=${projectId}` : '/assets';
        const data = await api(endpoint);

        if (projectId) {
            assets = assets.filter(a => a.project_id !== projectId).concat(data);
            assetCounts[projectId] = data.length;
        } else {
            assets = data;
        }
    } catch (error) {
        console.error('Error loading assets:', error);
        showToast('Error loading assets', 'error');
        if (!projectId) assets = [];
    }
}

// === Navigation ===
function showDashboard() {
    currentProject = null;
    selectedFolder = 'all';
    currentParentFolder = null;
    searchQuery = '';
    exitSelectionMode();

    elements.dashboardView.style.display = 'block';
    elements.projectView.style.display = 'none';
    elements.backToDashboard.style.display = 'none';
    elements.pageTitle.textContent = 'Asset Library';
    elements.searchInput.value = '';

    renderDashboard();
}

async function showProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    currentProject = project;
    selectedFolder = 'all';
    currentParentFolder = null;
    searchQuery = '';
    exitSelectionMode();

    elements.dashboardView.style.display = 'none';
    elements.projectView.style.display = 'block';
    elements.backToDashboard.style.display = 'flex';
    elements.pageTitle.textContent = project.name;
    elements.searchInput.value = '';

    renderFolders();
    showSkeletonLoading();

    await loadAssets(projectId);
    renderAssets();
    updateStorageInfo();
}

// === Rendering ===
function showDashboardSkeletonLoading() {
    elements.projectGrid.innerHTML = '';
    elements.emptyProjects.classList.add('hidden');

    for (let i = 0; i < 6; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-project-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-project-header"></div>
            <div class="skeleton-project-content">
                <div class="skeleton-project-line"></div>
                <div class="skeleton-project-line" style="width: 70%;"></div>
                <div class="skeleton-project-stats">
                    <div class="skeleton-project-stat"></div>
                    <div class="skeleton-project-stat"></div>
                </div>
            </div>
        `;
        elements.projectGrid.appendChild(skeletonCard);
    }
}

function renderDashboard() {
    elements.projectGrid.innerHTML = '';

    if (projects.length === 0) {
        elements.emptyProjects.classList.remove('hidden');
        return;
    }

    elements.emptyProjects.classList.add('hidden');

    projects.forEach(project => {
        const card = createProjectCard(project);
        elements.projectGrid.appendChild(card);
    });
}

function createProjectCard(project) {
    const assetCount = assetCounts[project.id] || 0;
    const projectFolders = folders.filter(f => f.project_id === project.id);

    // Sanitize color to prevent CSS injection
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(project.color) ? project.color : '#667eea';

    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.borderColor = safeColor;

    // Build card using safe DOM methods instead of innerHTML
    const header = document.createElement('div');
    header.className = 'project-card-header';
    header.style.background = `${safeColor}15`;

    const colorBadge = document.createElement('div');
    colorBadge.className = 'project-color-badge';
    colorBadge.style.background = safeColor;

    const nameEl = document.createElement('h3');
    nameEl.className = 'project-name';
    nameEl.textContent = project.name; // Safe: textContent escapes HTML

    header.appendChild(colorBadge);
    header.appendChild(nameEl);

    const descEl = document.createElement('p');
    descEl.className = 'project-description';
    descEl.textContent = project.description || 'No description';

    const stats = document.createElement('div');
    stats.className = 'project-stats';

    const assetStat = document.createElement('div');
    assetStat.className = 'project-stat';
    assetStat.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    `;
    const assetSpan = document.createElement('span');
    assetSpan.textContent = `${assetCount} assets`;
    assetStat.appendChild(assetSpan);

    const folderStat = document.createElement('div');
    folderStat.className = 'project-stat';
    folderStat.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    `;
    const folderSpan = document.createElement('span');
    folderSpan.textContent = `${projectFolders.length} folders`;
    folderStat.appendChild(folderSpan);

    stats.appendChild(assetStat);
    stats.appendChild(folderStat);

    const actions = document.createElement('div');
    actions.className = 'project-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-only';
    deleteBtn.title = 'Delete project';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(project.id);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(descEl);
    card.appendChild(stats);
    card.appendChild(actions);

    card.addEventListener('click', () => showProject(project.id));

    return card;
}

function renderFolders() {
    if (!currentProject) return;

    const projectFolders = folders.filter(f => f.project_id === currentProject.id);
    const currentLevelFolders = projectFolders.filter(f => f.parent_id === currentParentFolder);

    elements.folderChips.innerHTML = '';

    if (currentParentFolder) {
        const backChip = document.createElement('button');
        backChip.className = 'folder-chip folder-back';
        backChip.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
        `;
        backChip.addEventListener('click', () => {
            const parent = folders.find(f => f.id === currentParentFolder);
            currentParentFolder = parent ? parent.parent_id : null;
            selectedFolder = 'all';
            renderFolders();
            renderAssets();
        });
        elements.folderChips.appendChild(backChip);

        const currentFolder = folders.find(f => f.id === currentParentFolder);
        if (currentFolder) {
            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'folder-breadcrumb';
            // Safe: textContent escapes HTML
            breadcrumb.textContent = '📁 ' + currentFolder.name;
            elements.folderChips.appendChild(breadcrumb);
        }
    } else {
        const allChip = document.createElement('button');
        allChip.className = `folder-chip ${selectedFolder === 'all' ? 'active' : ''}`;
        allChip.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            All
        `;
        allChip.addEventListener('click', () => {
            selectedFolder = 'all';
            renderFolders();
            renderAssets();
        });
        elements.folderChips.appendChild(allChip);
    }

    currentLevelFolders.forEach(folder => {
        const hasSubfolders = projectFolders.some(f => f.parent_id === folder.id);

        const chip = document.createElement('button');
        chip.className = `folder-chip ${selectedFolder === folder.id ? 'active' : ''}`;

        // Build chip content safely
        const folderIcon = document.createElement('span');
        folderIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        chip.appendChild(folderIcon);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = folder.name; // Safe: textContent escapes HTML
        chip.appendChild(nameSpan);

        if (hasSubfolders) {
            const arrow = document.createElement('span');
            arrow.style.marginLeft = '4px';
            arrow.textContent = '▸';
            chip.appendChild(arrow);
        }

        const deleteSpan = document.createElement('span');
        deleteSpan.className = 'folder-chip-delete';
        deleteSpan.textContent = '×';
        deleteSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFolder(folder.id);
        });
        chip.appendChild(deleteSpan);

        chip.addEventListener('click', () => {
            selectedFolder = folder.id;
            renderFolders();
            renderAssets();
        });

        chip.addEventListener('dblclick', (e) => {
            e.preventDefault();
            currentParentFolder = folder.id;
            selectedFolder = 'all';
            renderFolders();
            renderAssets();
        });

        elements.folderChips.appendChild(chip);
    });
}

function showSkeletonLoading() {
    if (!currentProject) return;

    elements.assetGrid.innerHTML = '';
    elements.emptyAssets.classList.add('hidden');
    elements.assetCount.textContent = '';

    for (let i = 0; i < 12; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line tiny"></div>
            </div>
        `;
        elements.assetGrid.appendChild(skeletonCard);
    }
}

function renderAssets() {
    if (!currentProject) return;

    let filteredAssets = assets.filter(a => a.project_id === currentProject.id);

    if (selectedFolder !== 'all') {
        filteredAssets = filteredAssets.filter(a => a.folder_id === selectedFolder);
    } else if (currentParentFolder) {
        filteredAssets = filteredAssets.filter(a => a.folder_id === currentParentFolder);
    } else {
        filteredAssets = filteredAssets.filter(a => !a.folder_id || folders.find(f => f.id === a.folder_id && !f.parent_id));
    }

    if (searchQuery) {
        filteredAssets = filteredAssets.filter(a =>
            a.name.toLowerCase().includes(searchQuery)
        );
    }

    elements.assetGrid.innerHTML = '';

    if (filteredAssets.length === 0) {
        elements.emptyAssets.classList.remove('hidden');
        elements.assetCount.textContent = searchQuery ? 'No matching assets' : '0 assets';
        return;
    }

    elements.emptyAssets.classList.add('hidden');
    elements.assetCount.textContent = `${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''}`;

    filteredAssets.forEach(asset => {
        const card = createAssetCard(asset);
        elements.assetGrid.appendChild(card);
    });
}

function createAssetCard(asset) {
    const card = document.createElement('div');
    card.className = 'asset-card';
    if (selectedAssets.has(asset.id)) {
        card.classList.add('selected');
    }

    if (selectionMode) {
        const checkbox = document.createElement('div');
        checkbox.className = 'asset-checkbox';
        checkbox.innerHTML = `<input type="checkbox" ${selectedAssets.has(asset.id) ? 'checked' : ''}>`;
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAssetSelection(asset.id);
        });
        card.appendChild(checkbox);
    }

    const preview = document.createElement('div');
    preview.className = 'asset-preview';

    if (selectionMode) {
        preview.addEventListener('click', () => toggleAssetSelection(asset.id));
    }

    const img = document.createElement('img');
    img.src = asset.data;
    img.alt = asset.name;
    img.loading = 'lazy';
    preview.appendChild(img);

    const info = document.createElement('div');
    info.className = 'asset-info';

    if (asset.folder_id) {
        const folder = folders.find(f => f.id === asset.folder_id);
        if (folder) {
            const folderBadge = document.createElement('div');
            folderBadge.className = 'asset-folder-badge';
            folderBadge.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
            `;
            const folderName = document.createElement('span');
            folderName.textContent = folder.name; // Safe: textContent escapes HTML
            folderBadge.appendChild(folderName);
            info.appendChild(folderBadge);
        }
    }

    const name = document.createElement('div');
    name.className = 'asset-name';
    name.textContent = asset.name;
    name.title = asset.name;

    const meta = document.createElement('div');
    meta.className = 'asset-meta';

    const size = document.createElement('span');
    size.textContent = formatFileSize(asset.size);

    const date = document.createElement('span');
    date.textContent = formatDate(asset.upload_date);

    meta.appendChild(size);
    meta.appendChild(date);

    const actions = document.createElement('div');
    actions.className = 'asset-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-icon';
    downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download
    `;
    downloadBtn.onclick = (e) => {
        e.stopPropagation();
        downloadAsset(asset);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    `;
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteAsset(asset.id);
    };

    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);

    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(actions);

    card.appendChild(preview);
    card.appendChild(info);

    return card;
}

// === Project Operations ===
async function createProject() {
    const name = elements.projectNameInput.value.trim();
    const description = elements.projectDescInput.value.trim();

    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }

    try {
        await api('/projects', {
            method: 'POST',
            body: { name, description: description || null, color: selectedColor }
        });

        showToast(`Project "${name}" created`, 'success');
        await loadProjects();
        renderDashboard();
        closeProjectModal();
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project', 'error');
    }
}

async function deleteProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const projectAssets = assets.filter(a => a.project_id === projectId);
    const confirmMsg = projectAssets.length > 0
        ? `Delete project "${project.name}" and all ${projectAssets.length} asset(s) inside it?`
        : `Delete project "${project.name}"?`;

    if (confirm(confirmMsg)) {
        try {
            await api(`/projects/${projectId}`, { method: 'DELETE' });

            showToast('Project deleted', 'success');
            await loadProjects();
            await loadFolders();
            assets = assets.filter(a => a.project_id !== projectId);
            renderDashboard();
        } catch (error) {
            console.error('Error deleting project:', error);
            showToast('Error deleting project', 'error');
        }
    }
}

// === Folder Operations ===
async function createFolder() {
    if (!currentProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    const name = elements.folderNameInput.value.trim();

    if (!name) {
        showToast('Please enter a folder name', 'error');
        return;
    }

    try {
        await api('/folders', {
            method: 'POST',
            body: {
                name,
                project_id: currentProject.id,
                parent_id: currentParentFolder
            }
        });

        showToast(`Folder "${name}" created`, 'success');
        await loadFolders();
        renderFolders();
        closeFolderModal();
    } catch (error) {
        console.error('Error creating folder:', error);
        showToast('Error creating folder', 'error');
    }
}

async function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const assetsInFolder = assets.filter(a => a.folder_id === folderId);
    const confirmMsg = assetsInFolder.length > 0
        ? `Delete folder "${folder.name}" and ${assetsInFolder.length} asset(s) inside it?`
        : `Delete folder "${folder.name}"?`;

    if (confirm(confirmMsg)) {
        try {
            await api(`/folders/${folderId}`, { method: 'DELETE' });

            showToast('Folder deleted', 'success');
            selectedFolder = 'all';
            await loadFolders();
            if (currentProject) {
                await loadAssets(currentProject.id);
            }
            renderFolders();
            renderAssets();
        } catch (error) {
            console.error('Error deleting folder:', error);
            showToast('Error deleting folder', 'error');
        }
    }
}

// === Upload Operations ===
function openUploadModal() {
    selectedColor = '#667eea';
    populateProjectSelect();
    elements.uploadModal.classList.add('show');
}

function closeUploadModal() {
    elements.uploadModal.classList.remove('show');
    elements.fileInput.value = '';
    elements.projectSelect.value = '';
    elements.folderSelect.value = '';
    elements.filePreview.style.display = 'none';
    elements.uploadFilesBtn.disabled = true;
    pendingFiles = [];
}

function populateProjectSelect() {
    elements.projectSelect.innerHTML = '<option value="">Select a project...</option>';
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        if (currentProject && project.id === currentProject.id) {
            option.selected = true;
        }
        elements.projectSelect.appendChild(option);
    });

    if (currentProject) {
        populateFolderSelect(currentProject.id);
    }
}

function handleProjectSelection(e) {
    const projectId = e.target.value;
    if (projectId) {
        populateFolderSelect(projectId);
        checkUploadReady();
    } else {
        elements.folderSelect.innerHTML = '<option value="">No folder</option>';
        elements.uploadFilesBtn.disabled = true;
    }
}

function populateFolderSelect(projectId) {
    const projectFolders = folders.filter(f => f.project_id === projectId);
    elements.folderSelect.innerHTML = '<option value="">No folder</option>';
    projectFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        elements.folderSelect.appendChild(option);
    });
}

function handleFileSelection(e) {
    pendingFiles = Array.from(e.target.files);
    if (pendingFiles.length > 0) {
        elements.filePreview.style.display = 'block';
        elements.fileCount.textContent = `${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`;
        checkUploadReady();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');
    pendingFiles = Array.from(e.dataTransfer.files);
    if (pendingFiles.length > 0) {
        elements.filePreview.style.display = 'block';
        elements.fileCount.textContent = `${pendingFiles.length} file${pendingFiles.length !== 1 ? 's' : ''}`;
        checkUploadReady();
    }
}

function checkUploadReady() {
    elements.uploadFilesBtn.disabled = !(pendingFiles.length > 0 && elements.projectSelect.value);
}

async function uploadFiles() {
    const projectId = elements.projectSelect.value;
    const folderId = elements.folderSelect.value || null;

    if (!projectId || pendingFiles.length === 0) {
        showToast('Please select a project and files', 'error');
        return;
    }

    const validFiles = pendingFiles.filter(file => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            showToast(`"${file.name}" is not a supported format`, 'error');
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            showToast(`"${file.name}" exceeds 2MB limit`, 'error');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    let successCount = 0;
    for (const file of validFiles) {
        try {
            const base64 = await fileToBase64(file);

            await api('/assets', {
                method: 'POST',
                body: {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64,
                    project_id: projectId,
                    folder_id: folderId
                }
            });

            successCount++;
        } catch (error) {
            console.error('Error uploading file:', file.name, error);
            showToast(`Failed to upload "${file.name}"`, 'error');
        }
    }

    if (successCount > 0) {
        showToast(`${successCount} asset(s) uploaded successfully`, 'success');
        if (currentProject && currentProject.id === projectId) {
            await loadAssets(projectId);
            renderAssets();
            updateStorageInfo();
        }
        closeUploadModal();
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// === Asset Operations ===
async function deleteAsset(id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    if (confirm(`Delete "${asset.name}"?`)) {
        try {
            await api(`/assets/${id}`, { method: 'DELETE' });

            showToast('Asset deleted', 'success');
            if (currentProject) {
                await loadAssets(currentProject.id);
                renderAssets();
                updateStorageInfo();
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            showToast('Error deleting asset', 'error');
        }
    }
}

function downloadAsset(asset) {
    try {
        const link = document.createElement('a');
        link.href = asset.data;
        link.download = asset.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloaded "${asset.name}"`, 'success');
    } catch (error) {
        console.error('Error downloading asset:', error);
        showToast('Error downloading asset', 'error');
    }
}

// === Bulk Selection ===
function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedAssets.clear();

    if (selectionMode) {
        elements.bulkActions.style.display = 'flex';
        elements.selectionModeBtn.classList.add('active');
    } else {
        elements.bulkActions.style.display = 'none';
        elements.selectionModeBtn.classList.remove('active');
    }

    updateSelectedCount();
    renderAssets();
}

function exitSelectionMode() {
    selectionMode = false;
    selectedAssets.clear();
    elements.bulkActions.style.display = 'none';
    elements.selectionModeBtn.classList.remove('active');
    if (currentProject) {
        renderAssets();
    }
}

function toggleAssetSelection(assetId) {
    if (selectedAssets.has(assetId)) {
        selectedAssets.delete(assetId);
    } else {
        selectedAssets.add(assetId);
    }
    updateSelectedCount();
    renderAssets();
}

function selectAll() {
    if (!currentProject) return;

    let filteredAssets = assets.filter(a => a.project_id === currentProject.id);

    if (selectedFolder !== 'all') {
        filteredAssets = filteredAssets.filter(a => a.folder_id === selectedFolder);
    }

    if (searchQuery) {
        filteredAssets = filteredAssets.filter(a =>
            a.name.toLowerCase().includes(searchQuery)
        );
    }

    filteredAssets.forEach(asset => selectedAssets.add(asset.id));
    updateSelectedCount();
    renderAssets();
}

function deselectAll() {
    selectedAssets.clear();
    updateSelectedCount();
    renderAssets();
}

function updateSelectedCount() {
    elements.selectedCount.textContent = `${selectedAssets.size} selected`;
}

async function bulkDelete() {
    if (selectedAssets.size === 0) {
        showToast('No assets selected', 'error');
        return;
    }

    if (confirm(`Delete ${selectedAssets.size} selected asset(s)? This cannot be undone.`)) {
        try {
            const ids = Array.from(selectedAssets);

            await api('/assets/bulk-delete', {
                method: 'POST',
                body: { ids }
            });

            showToast(`${selectedAssets.size} asset(s) deleted successfully`, 'success');
            selectedAssets.clear();
            if (currentProject) {
                await loadAssets(currentProject.id);
            }
            updateSelectedCount();
            renderAssets();
            updateStorageInfo();
        } catch (error) {
            console.error('Error deleting assets:', error);
            showToast('Error deleting assets', 'error');
        }
    }
}

async function bulkDownload() {
    if (selectedAssets.size === 0) {
        showToast('No assets selected', 'error');
        return;
    }

    const assetIds = Array.from(selectedAssets);
    const selectedAssetsList = assets.filter(a => assetIds.includes(a.id));

    showToast(`Downloading ${selectedAssetsList.length} asset(s)...`, 'info');

    for (let i = 0; i < selectedAssetsList.length; i++) {
        const asset = selectedAssetsList[i];

        setTimeout(() => {
            try {
                const link = document.createElement('a');
                link.href = asset.data;
                link.download = asset.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Error downloading asset:', asset.name, error);
            }
        }, i * 300);
    }

    setTimeout(() => {
        showToast(`${selectedAssetsList.length} asset(s) downloaded`, 'success');
    }, selectedAssetsList.length * 300 + 500);
}

// === Search ===
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    elements.clearSearch.classList.toggle('visible', searchQuery.length > 0);
    renderAssets();
}

function clearSearch() {
    elements.searchInput.value = '';
    searchQuery = '';
    elements.clearSearch.classList.remove('visible');
    renderAssets();
}

// === Modal Functions ===
function openProjectModal() {
    elements.projectNameInput.value = '';
    elements.projectDescInput.value = '';
    selectedColor = '#667eea';
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === selectedColor);
    });
    elements.projectModal.classList.add('show');
    elements.projectNameInput.focus();
}

function closeProjectModal() {
    elements.projectModal.classList.remove('show');
}

function openFolderModal() {
    if (!currentProject) {
        showToast('Please open a project first', 'error');
        return;
    }
    elements.folderNameInput.value = '';
    elements.folderModal.classList.add('show');
    elements.folderNameInput.focus();
}

function closeFolderModal() {
    elements.folderModal.classList.remove('show');
}

// === Utility Functions ===
function updateStorageInfo() {
    const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0);
    elements.storageUsed.textContent = formatFileSize(totalSize);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = 'toast show';

    if (type === 'error') {
        elements.toast.classList.add('error');
    } else if (type === 'success') {
        elements.toast.classList.add('success');
    }

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// === Global Functions ===
window.deleteProject = deleteProject;
window.deleteFolder = deleteFolder;

// === Initialize ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopPolling);
