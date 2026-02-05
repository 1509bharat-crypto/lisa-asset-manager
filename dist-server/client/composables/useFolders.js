"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFolders = useFolders;
const vue_1 = require("vue");
const api_1 = require("../services/api");
const useToast_1 = require("./useToast");
const folders = (0, vue_1.ref)([]);
const selectedFolders = (0, vue_1.ref)([]);
const loading = (0, vue_1.ref)(false);
const error = (0, vue_1.ref)(null);
function useFolders() {
    const toast = (0, useToast_1.useToast)();
    const fetchFolders = async (projectId) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api_1.api.getFolders(projectId);
            if (response.error) {
                throw new Error(response.error);
            }
            folders.value = response.data || [];
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to fetch folders';
            error.value = message;
            toast.error(message);
        }
        finally {
            loading.value = false;
        }
    };
    const createFolder = async (projectId, name) => {
        error.value = null;
        try {
            const response = await api_1.api.createFolder(projectId, name);
            if (response.error) {
                throw new Error(response.error);
            }
            if (response.data) {
                folders.value.push(response.data);
                toast.success(`Folder "${name}" created`);
            }
            return response.data;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create folder';
            error.value = message;
            toast.error(message);
            return null;
        }
    };
    const deleteFolder = async (projectId, name) => {
        error.value = null;
        try {
            const response = await api_1.api.deleteFolder(projectId, name);
            if (response.error) {
                throw new Error(response.error);
            }
            folders.value = folders.value.filter((f) => f.name !== name);
            selectedFolders.value = selectedFolders.value.filter((f) => f !== name);
            toast.success(`Folder "${name}" deleted`);
            return true;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete folder';
            error.value = message;
            toast.error(message);
            return false;
        }
    };
    const selectFolder = (name) => {
        if (!selectedFolders.value.includes(name)) {
            selectedFolders.value.push(name);
        }
    };
    const deselectFolder = (name) => {
        selectedFolders.value = selectedFolders.value.filter((f) => f !== name);
    };
    const toggleFolder = (name) => {
        if (selectedFolders.value.includes(name)) {
            deselectFolder(name);
        }
        else {
            selectFolder(name);
        }
    };
    const clearSelection = () => {
        selectedFolders.value = [];
    };
    const clearFolders = () => {
        folders.value = [];
        selectedFolders.value = [];
    };
    return {
        folders: (0, vue_1.readonly)(folders),
        selectedFolders: (0, vue_1.readonly)(selectedFolders),
        loading: (0, vue_1.readonly)(loading),
        error: (0, vue_1.readonly)(error),
        fetchFolders,
        createFolder,
        deleteFolder,
        selectFolder,
        deselectFolder,
        toggleFolder,
        clearSelection,
        clearFolders
    };
}
//# sourceMappingURL=useFolders.js.map