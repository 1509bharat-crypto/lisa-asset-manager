import { IncomingMessage, ServerResponse } from 'http';
export interface Project {
    id: string;
    name: string;
    description: string | null;
    color: string;
    created_at: Date;
}
export interface Folder {
    id: string;
    name: string;
    project_id: string;
    parent_id: string | null;
    created_at: Date;
}
export interface Asset {
    id: string;
    name: string;
    type: string;
    size: number;
    data: string;
    project_id: string;
    folder_id: string | null;
    upload_date: Date;
    created_at: Date;
}
export interface CreateProjectInput {
    name: string;
    description?: string;
    color?: string;
}
export interface CreateFolderInput {
    name: string;
    project_id: string;
    parent_id?: string;
}
export interface CreateAssetInput {
    name: string;
    type: string;
    size?: number;
    data: string;
    project_id: string;
    folder_id?: string;
}
export interface BulkDeleteInput {
    ids: string[];
}
export interface ImageAnalysisInput {
    imageData: string;
}
export interface ImageAnalysisResult {
    category: string;
    tags: string[];
    colors: string[];
    description: string;
}
export interface RouteParams {
    [key: string]: string;
}
export interface QueryParams {
    [key: string]: string;
}
export type RouteHandler = (req: IncomingMessage, res: ServerResponse, params: RouteParams, query: QueryParams) => Promise<void>;
export interface RouteMatch {
    handler: RouteHandler;
    params: RouteParams;
    query: QueryParams;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
//# sourceMappingURL=types.d.ts.map