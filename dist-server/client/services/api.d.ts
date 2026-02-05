import type { Project, Asset, Folder, ApiResponse } from '../types';
export declare const api: {
    getProjects(): Promise<ApiResponse<Project[]>>;
    getProject(id: string): Promise<ApiResponse<Project>>;
    createProject(data: {
        name: string;
        description?: string;
        color: string;
    }): Promise<ApiResponse<Project>>;
    updateProject(id: string, data: Partial<Pick<Project, "name" | "description" | "color">>): Promise<ApiResponse<Project>>;
    deleteProject(id: string): Promise<ApiResponse<void>>;
    getAssets(projectId: string, folder?: string): Promise<ApiResponse<Asset[]>>;
    uploadAsset(projectId: string, file: File, folders?: string[], onProgress?: (progress: number) => void): Promise<ApiResponse<Asset>>;
    deleteAsset(id: string): Promise<ApiResponse<void>>;
    deleteAssets(ids: string[]): Promise<ApiResponse<void>>;
    updateAssetFolders(id: string, folders: string[]): Promise<ApiResponse<Asset>>;
    searchAssets(projectId: string, query: string): Promise<ApiResponse<Asset[]>>;
    getFolders(projectId: string): Promise<ApiResponse<Folder[]>>;
    createFolder(projectId: string, name: string): Promise<ApiResponse<Folder>>;
    deleteFolder(projectId: string, name: string): Promise<ApiResponse<void>>;
};
//# sourceMappingURL=api.d.ts.map