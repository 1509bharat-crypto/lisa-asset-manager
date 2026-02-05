import type { CreateProjectInput, CreateFolderInput, CreateAssetInput } from './types';
export declare function isValidUUID(str: unknown): str is string;
export declare function isValidColor(str: unknown): str is string;
export declare function isValidBase64Image(str: unknown): str is string;
export declare function sanitizeString(str: unknown, maxLength?: number): string;
export declare function validateProjectInput(data: unknown): {
    valid: boolean;
    errors: string[];
    data?: CreateProjectInput;
};
export declare function validateFolderInput(data: unknown): {
    valid: boolean;
    errors: string[];
    data?: CreateFolderInput;
};
export declare function validateAssetInput(data: unknown): {
    valid: boolean;
    errors: string[];
    data?: CreateAssetInput;
};
export declare function validateBulkDeleteInput(data: unknown): {
    valid: boolean;
    errors: string[];
    ids?: string[];
};
//# sourceMappingURL=validation.d.ts.map