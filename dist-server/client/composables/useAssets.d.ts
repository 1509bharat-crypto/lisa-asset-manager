import type { Asset } from '../types';
export declare function useAssets(): {
    assets: Readonly<import("vue").Ref<readonly {
        readonly id: string;
        readonly project_id: string;
        readonly filename: string;
        readonly url: string;
        readonly file_size: number;
        readonly mime_type: string;
        readonly width: number;
        readonly height: number;
        readonly folders: readonly string[];
        readonly created_at: string;
        readonly updated_at: string;
    }[], readonly {
        readonly id: string;
        readonly project_id: string;
        readonly filename: string;
        readonly url: string;
        readonly file_size: number;
        readonly mime_type: string;
        readonly width: number;
        readonly height: number;
        readonly folders: readonly string[];
        readonly created_at: string;
        readonly updated_at: string;
    }[]>>;
    loading: Readonly<import("vue").Ref<boolean, boolean>>;
    error: Readonly<import("vue").Ref<string | null, string | null>>;
    uploadQueue: Readonly<import("vue").Ref<readonly {
        readonly file: {
            readonly name: string;
            readonly lastModified: number;
            readonly size: number;
            readonly type: string;
            readonly arrayBuffer: () => Promise<ArrayBuffer>;
            readonly bytes: () => Promise<Uint8Array>;
            readonly slice: (start?: number, end?: number, type?: string) => import("buffer").Blob;
            readonly text: () => Promise<string>;
            readonly stream: () => import("stream/web").ReadableStream;
        };
        readonly progress: number;
        readonly status: "pending" | "uploading" | "complete" | "error";
        readonly error?: string | undefined;
    }[], readonly {
        readonly file: {
            readonly name: string;
            readonly lastModified: number;
            readonly size: number;
            readonly type: string;
            readonly arrayBuffer: () => Promise<ArrayBuffer>;
            readonly bytes: () => Promise<Uint8Array>;
            readonly slice: (start?: number, end?: number, type?: string) => import("buffer").Blob;
            readonly text: () => Promise<string>;
            readonly stream: () => import("stream/web").ReadableStream;
        };
        readonly progress: number;
        readonly status: "pending" | "uploading" | "complete" | "error";
        readonly error?: string | undefined;
    }[]>>;
    isUploading: import("vue").ComputedRef<boolean>;
    fetchAssets: (projectId: string, folder?: string) => Promise<void>;
    uploadAssets: (projectId: string, files: File[], folders?: string[]) => Promise<Asset[]>;
    deleteAsset: (id: string) => Promise<boolean>;
    deleteAssets: (ids: string[]) => Promise<boolean>;
    updateAssetFolders: (id: string, folders: string[]) => Promise<Asset | null | undefined>;
    searchAssets: (projectId: string, query: string) => Promise<void>;
    clearAssets: () => void;
};
//# sourceMappingURL=useAssets.d.ts.map