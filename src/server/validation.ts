import type { CreateProjectInput, CreateFolderInput, CreateAssetInput } from './types';

// === Regex Patterns ===
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const BASE64_DATA_URL_REGEX = /^data:image\/(jpeg|png|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

// === Validation Helpers ===
export function isValidUUID(str: unknown): str is string {
    return typeof str === 'string' && UUID_REGEX.test(str);
}

export function isValidColor(str: unknown): str is string {
    return typeof str === 'string' && HEX_COLOR_REGEX.test(str);
}

export function isValidBase64Image(str: unknown): str is string {
    return typeof str === 'string' && BASE64_DATA_URL_REGEX.test(str);
}

export function sanitizeString(str: unknown, maxLength = 255): string {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

// === Input Validators ===
export function validateProjectInput(data: unknown): { valid: boolean; errors: string[]; data?: CreateProjectInput } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid input'] };
    }

    const input = data as Record<string, unknown>;

    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
        errors.push('Name is required');
    } else if (input.name.length > 100) {
        errors.push('Name must be 100 characters or less');
    }

    if (input.description !== undefined && input.description !== null) {
        if (typeof input.description !== 'string') {
            errors.push('Description must be a string');
        } else if (input.description.length > 500) {
            errors.push('Description must be 500 characters or less');
        }
    }

    if (input.color !== undefined && input.color !== null && !isValidColor(input.color)) {
        errors.push('Invalid color format (use #RRGGBB)');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        data: {
            name: sanitizeString(input.name, 100),
            description: input.description ? sanitizeString(input.description, 500) : undefined,
            color: isValidColor(input.color) ? input.color : undefined
        }
    };
}

export function validateFolderInput(data: unknown): { valid: boolean; errors: string[]; data?: CreateFolderInput } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid input'] };
    }

    const input = data as Record<string, unknown>;

    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
        errors.push('Name is required');
    } else if (input.name.length > 100) {
        errors.push('Name must be 100 characters or less');
    }

    if (!input.project_id || !isValidUUID(input.project_id)) {
        errors.push('Valid project_id is required');
    }

    if (input.parent_id !== undefined && input.parent_id !== null && !isValidUUID(input.parent_id)) {
        errors.push('Invalid parent_id format');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        data: {
            name: sanitizeString(input.name, 100),
            project_id: input.project_id as string,
            parent_id: isValidUUID(input.parent_id) ? input.parent_id : undefined
        }
    };
}

export function validateAssetInput(data: unknown): { valid: boolean; errors: string[]; data?: CreateAssetInput } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid input'] };
    }

    const input = data as Record<string, unknown>;

    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
        errors.push('Name is required');
    } else if (input.name.length > 255) {
        errors.push('Name must be 255 characters or less');
    }

    if (!input.type || typeof input.type !== 'string') {
        errors.push('Type is required');
    }

    if (!input.project_id || !isValidUUID(input.project_id)) {
        errors.push('Valid project_id is required');
    }

    if (input.folder_id !== undefined && input.folder_id !== null && !isValidUUID(input.folder_id)) {
        errors.push('Invalid folder_id format');
    }

    if (!input.data || !isValidBase64Image(input.data)) {
        errors.push('Valid base64 image data is required');
    }

    if (input.size !== undefined && input.size !== null) {
        if (typeof input.size !== 'number' || input.size < 0) {
            errors.push('Size must be a positive number');
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        data: {
            name: sanitizeString(input.name, 255),
            type: sanitizeString(input.type, 50),
            size: typeof input.size === 'number' ? Math.max(0, input.size) : 0,
            data: input.data as string,
            project_id: input.project_id as string,
            folder_id: isValidUUID(input.folder_id) ? input.folder_id : undefined
        }
    };
}

export function validateBulkDeleteInput(data: unknown): { valid: boolean; errors: string[]; ids?: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid input'] };
    }

    const input = data as Record<string, unknown>;

    if (!input.ids || !Array.isArray(input.ids) || input.ids.length === 0) {
        errors.push('ids array is required');
        return { valid: false, errors };
    }

    const invalidIds = input.ids.filter(id => !isValidUUID(id));
    if (invalidIds.length > 0) {
        errors.push('Invalid ID format in array');
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        ids: input.ids as string[]
    };
}
