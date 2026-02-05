import type { Project } from '../types';
export declare function useProjects(): {
    projects: Readonly<import("vue").Ref<readonly {
        readonly id: string;
        readonly name: string;
        readonly description?: string | undefined;
        readonly color: string;
        readonly asset_count: number;
        readonly total_size: number;
        readonly created_at: string;
        readonly updated_at: string;
    }[], readonly {
        readonly id: string;
        readonly name: string;
        readonly description?: string | undefined;
        readonly color: string;
        readonly asset_count: number;
        readonly total_size: number;
        readonly created_at: string;
        readonly updated_at: string;
    }[]>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchProjects: () => Promise<void>;
    createProject: (data: {
        name: string;
        description?: string;
        color: string;
    }) => Promise<Project | null | undefined>;
    updateProject: (id: string, data: Partial<Pick<Project, "name" | "description" | "color">>) => Promise<Project | null | undefined>;
    deleteProject: (id: string) => Promise<boolean>;
    getProjectById: (id: string) => {
        id: string;
        name: string;
        description?: string | undefined;
        color: string;
        asset_count: number;
        total_size: number;
        created_at: string;
        updated_at: string;
    } | undefined;
};
//# sourceMappingURL=useProjects.d.ts.map