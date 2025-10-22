// === Constants and Configuration ===
const STORAGE_KEY = 'assetLibrary';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const STORAGE_WARNING_THRESHOLD = 0.8; // 80% of quota
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// === State Management ===
let assets = [];
let searchQuery = '';

// === DOM Elements ===
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    assetGrid: document.getElementById('assetGrid'),
    emptyState: document.getElementById('emptyState'),
    toast: document.getElementById('toast'),
    storageUsed: document.getElementById('storageUsed'),
    assetCount: document.getElementById('assetCount'),
    clearAllBtn: document.getElementById('clearAllBtn')
};

// === Initialize App ===
function init() {
    loadAssets();
    renderAssets();
    updateStorageInfo();
    attachEventListeners();
}

// === Event Listeners ===
function attachEventListeners() {
    // Upload button click
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());

    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target === elements.uploadArea || e.target.closest('.upload-icon, .upload-text, .upload-subtext')) {
            elements.fileInput.click();
        }
    });

    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Search functionality
    elements.searchInput.addEventListener('input', handleSearch);
    elements.clearSearch.addEventListener('click', clearSearch);

    // Clear all button
    elements.clearAllBtn.addEventListener('click', handleClearAll);
}

// === File Upload Handlers ===
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Reset input
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
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

async function processFiles(files) {
    if (files.length === 0) return;

    // Filter valid files
    const validFiles = files.filter(file => {
        // Check file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            showToast(`"${file.name}" is not a supported format`, 'error');
            return false;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            showToast(`"${file.name}" exceeds 2MB limit`, 'error');
            return false;
        }

        return true;
    });

    if (validFiles.length === 0) return;

    // Check storage before processing
    if (!checkStorageAvailable()) {
        showToast('Storage limit reached. Please delete some assets.', 'error');
        return;
    }

    // Process files
    let successCount = 0;
    for (const file of validFiles) {
        try {
            const base64 = await fileToBase64(file);
            const asset = {
                id: generateId(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                uploadDate: new Date().toISOString()
            };

            // Check for duplicate names
            const existingIndex = assets.findIndex(a => a.name === asset.name);
            if (existingIndex !== -1) {
                // Replace existing asset
                assets[existingIndex] = asset;
            } else {
                assets.push(asset);
            }

            successCount++;
        } catch (error) {
            console.error('Error processing file:', file.name, error);
            showToast(`Failed to process "${file.name}"`, 'error');
        }
    }

    if (successCount > 0) {
        saveAssets();
        renderAssets();
        updateStorageInfo();
        showToast(`${successCount} asset(s) uploaded successfully`, 'success');
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

// === Search Functionality ===
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

// === Asset Management ===
function loadAssets() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        assets = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading assets:', error);
        assets = [];
        showToast('Error loading assets from storage', 'error');
    }
}

function saveAssets() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch (error) {
        console.error('Error saving assets:', error);
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please delete some assets.', 'error');
        } else {
            showToast('Error saving assets to storage', 'error');
        }
    }
}

function deleteAsset(id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    if (confirm(`Delete "${asset.name}"?`)) {
        assets = assets.filter(a => a.id !== id);
        saveAssets();
        renderAssets();
        updateStorageInfo();
        showToast('Asset deleted', 'success');
    }
}

function downloadAsset(id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

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

function handleClearAll() {
    if (assets.length === 0) return;

    if (confirm(`Are you sure you want to delete all ${assets.length} assets? This cannot be undone.`)) {
        assets = [];
        saveAssets();
        renderAssets();
        updateStorageInfo();
        showToast('All assets cleared', 'success');
    }
}

// === Rendering ===
function renderAssets() {
    const filteredAssets = searchQuery
        ? assets.filter(asset => asset.name.toLowerCase().includes(searchQuery))
        : assets;

    elements.assetGrid.innerHTML = '';

    if (filteredAssets.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.assetCount.textContent = searchQuery
            ? 'No matching assets'
            : '0 assets';
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.assetCount.textContent = `${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''}`;

    filteredAssets.forEach(asset => {
        const card = createAssetCard(asset);
        elements.assetGrid.appendChild(card);
    });
}

function createAssetCard(asset) {
    const card = document.createElement('div');
    card.className = 'asset-card';

    const preview = document.createElement('div');
    preview.className = 'asset-preview';

    const img = document.createElement('img');
    img.src = asset.data;
    img.alt = asset.name;
    img.loading = 'lazy';
    preview.appendChild(img);

    const info = document.createElement('div');
    info.className = 'asset-info';

    const name = document.createElement('div');
    name.className = 'asset-name';
    name.textContent = asset.name;
    name.title = asset.name;

    const meta = document.createElement('div');
    meta.className = 'asset-meta';

    const size = document.createElement('span');
    size.textContent = formatFileSize(asset.size);

    const date = document.createElement('span');
    date.textContent = formatDate(asset.uploadDate);

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
        downloadAsset(asset.id);
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

// === Storage Management ===
function updateStorageInfo() {
    const totalSize = assets.reduce((sum, asset) => sum + (asset.data?.length || 0), 0);
    elements.storageUsed.textContent = formatFileSize(totalSize);

    // Check storage usage
    const estimatedQuota = 5 * 1024 * 1024; // ~5MB for localStorage
    const usageRatio = totalSize / estimatedQuota;

    if (usageRatio > STORAGE_WARNING_THRESHOLD) {
        elements.storageUsed.style.color = 'var(--danger-color)';
    } else {
        elements.storageUsed.style.color = 'var(--text-primary)';
    }
}

function checkStorageAvailable() {
    try {
        const totalSize = assets.reduce((sum, asset) => sum + (asset.data?.length || 0), 0);
        const estimatedQuota = 5 * 1024 * 1024; // ~5MB
        return totalSize < estimatedQuota * 0.95; // Leave 5% buffer
    } catch (error) {
        return true; // Allow if we can't check
    }
}

// === Utility Functions ===
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// === Initialize on DOM Load ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
