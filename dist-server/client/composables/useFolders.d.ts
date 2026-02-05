import type { Folder } from '../types';
export declare function useFolders(): {
    folders: Readonly<import("vue").Ref<readonly {
        readonly name: string;
        readonly count: number;
    }[], readonly {
        readonly name: string;
        readonly count: number;
    }[]>>;
    selectedFolders: Readonly<import("vue").Ref<readonly string[], readonly string[]>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    fetchFolders: (projectId: string) => Promise<void>;
    createFolder: (projectId: string, name: string) => Promise<Folder | null | undefined>;
    deleteFolder: (projectId: string, name: string) => Promise<boolean>;
    selectFolder: (name: string) => void;
    deselectFolder: (name: string) => void;
    toggleFolder: (name: string) => void;
    clearSelection: () => void;
    clearFolders: () => void;
};
//# sourceMappingURL=useFolders.d.ts.map