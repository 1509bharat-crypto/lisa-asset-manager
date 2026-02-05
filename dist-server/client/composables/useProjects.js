"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProjects = useProjects;
const vue_1 = require("vue");
const api_1 = require("../services/api");
const useToast_1 = require("./useToast");
const projects = (0, vue_1.ref)([]);
const loading = (0, vue_1.ref)(false);
const error = (0, vue_1.ref)(null);
function useProjects() {
    const toast = (0, useToast_1.useToast)();
    const fetchProjects = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api_1.api.getProjects();
            if (response.error) {
                throw new Error(response.error);
            }
            projects.value = response.data || [];
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to fetch projects';
            error.value = message;
            toast.error(message);
        }
        finally {
            loading.value = false;
        }
    };
    const createProject = async (data) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api_1.api.createProject(data);
            if (response.error) {
                throw new Error(response.error);
            }
            if (response.data) {
                projects.value.unshift(response.data);
                toast.success(`Project "${data.name}" created`);
            }
            return response.data;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create project';
            error.value = message;
            toast.error(message);
            return null;
        }
        finally {
            loading.value = false;
        }
    };
    const updateProject = async (id, data) => {
        error.value = null;
        try {
            const response = await api_1.api.updateProject(id, data);
            if (response.error) {
                throw new Error(response.error);
            }
            if (response.data) {
                const index = projects.value.findIndex((p) => p.id === id);
                if (index > -1) {
                    projects.value[index] = response.data;
                }
                toast.success('Project updated');
            }
            return response.data;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to update project';
            error.value = message;
            toast.error(message);
            return null;
        }
    };
    const deleteProject = async (id) => {
        error.value = null;
        try {
            const response = await api_1.api.deleteProject(id);
            if (response.error) {
                throw new Error(response.error);
            }
            projects.value = projects.value.filter((p) => p.id !== id);
            toast.success('Project deleted');
            return true;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete project';
            error.value = message;
            toast.error(message);
            return false;
        }
    };
    const getProjectById = (id) => {
        return projects.value.find((p) => p.id === id);
    };
    return {
        projects: (0, vue_1.readonly)(projects),
        loading: (0, vue_1.readonly)(loading),
        error: (0, vue_1.readonly)(error),
        fetchProjects,
        createProject,
        updateProject,
        deleteProject,
        getProjectById
    };
}
//# sourceMappingURL=useProjects.js.map