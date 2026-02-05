"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAssets = useAssets;
const vue_1 = require("vue");
const api_1 = require("../services/api");
const useToast_1 = require("./useToast");
const assets = (0, vue_1.ref)([]);
const loading = (0, vue_1.ref)(false);
const error = (0, vue_1.ref)(null);
const uploadQueue = (0, vue_1.ref)([]);
function useAssets() {
    const toast = (0, useToast_1.useToast)();
    const isUploading = (0, vue_1.computed)(() => uploadQueue.value.some((u) => u.status === 'uploading'));
    const fetchAssets = async (projectId, folder) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api_1.api.getAssets(projectId, folder);
            if (response.error) {
                throw new Error(response.error);
            }
            assets.value = response.data || [];
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to fetch assets';
            error.value = message;
            toast.error(message);
        }
        finally {
            loading.value = false;
        }
    };
    const uploadAssets = async (projectId, files, folders = []) => {
        const newUploads = files.map((file) => ({
            file,
            progress: 0,
            status: 'pending'
        }));
        uploadQueue.value.push(...newUploads);
        const results = [];
        for (const upload of newUploads) {
            upload.status = 'uploading';
            try {
                const response = await api_1.api.uploadAsset(projectId, upload.file, folders, (progress) => {
                    upload.progress = progress;
                });
                if (response.error) {
                    throw new Error(response.error);
                }
                if (response.data) {
                    upload.status = 'complete';
                    upload.progress = 100;
                    results.push(response.data);
                    assets.value.unshift(response.data);
                }
            }
            catch (e) {
                upload.status = 'error';
                upload.error = e instanceof Error ? e.message : 'Upload failed';
                toast.error(`Failed to upload ${upload.file.name}`);
            }
        }
        // Clear completed uploads after delay
        setTimeout(() => {
            uploadQueue.value = uploadQueue.value.filter((u) => u.status !== 'complete');
        }, 3000);
        if (results.length > 0) {
            toast.success(`${results.length} file(s) uploaded`);
        }
        return results;
    };
    const deleteAsset = async (id) => {
        error.value = null;
        try {
            const response = await api_1.api.deleteAsset(id);
            if (response.error) {
                throw new Error(response.error);
            }
            assets.value = assets.value.filter((a) => a.id !== id);
            toast.success('Asset deleted');
            return true;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete asset';
            error.value = message;
            toast.error(message);
            return false;
        }
    };
    const deleteAssets = async (ids) => {
        error.value = null;
        try {
            const response = await api_1.api.deleteAssets(ids);
            if (response.error) {
                throw new Error(response.error);
            }
            assets.value = assets.value.filter((a) => !ids.includes(a.id));
            toast.success(`${ids.length} asset(s) deleted`);
            return true;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete assets';
            error.value = message;
            toast.error(message);
            return false;
        }
    };
    const updateAssetFolders = async (id, folders) => {
        error.value = null;
        try {
            const response = await api_1.api.updateAssetFolders(id, folders);
            if (response.error) {
                throw new Error(response.error);
            }
            if (response.data) {
                const index = assets.value.findIndex((a) => a.id === id);
                if (index > -1) {
                    assets.value[index] = response.data;
                }
            }
            return response.data;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to update asset folders';
            error.value = message;
            toast.error(message);
            return null;
        }
    };
    const searchAssets = async (projectId, query) => {
        if (!query.trim()) {
            return fetchAssets(projectId);
        }
        loading.value = true;
        error.value = null;
        try {
            const response = await api_1.api.searchAssets(projectId, query);
            if (response.error) {
                throw new Error(response.error);
            }
            assets.value = response.data || [];
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Search failed';
            error.value = message;
            toast.error(message);
        }
        finally {
            loading.value = false;
        }
    };
    const clearAssets = () => {
        assets.value = [];
    };
    return {
        assets: (0, vue_1.readonly)(assets),
        loading: (0, vue_1.readonly)(loading),
        error: (0, vue_1.readonly)(error),
        uploadQueue: (0, vue_1.readonly)(uploadQueue),
        isUploading,
        fetchAssets,
        uploadAssets,
        deleteAsset,
        deleteAssets,
        updateAssetFolders,
        searchAssets,
        clearAssets
    };
}
//# sourceMappingURL=useAssets.js.map