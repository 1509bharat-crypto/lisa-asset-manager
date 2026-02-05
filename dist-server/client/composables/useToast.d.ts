import type { Toast } from '../types';
export declare function useToast(): {
    toasts: Readonly<import("vue").Ref<readonly {
        readonly id: string;
        readonly type: "success" | "error" | "warning" | "info";
        readonly message: string;
        readonly duration?: number | undefined;
    }[], readonly {
        readonly id: string;
        readonly type: "success" | "error" | "warning" | "info";
        readonly message: string;
        readonly duration?: number | undefined;
    }[]>>;
    show: (message: string, type?: Toast["type"], duration?: number) => string;
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    warning: (message: string, duration?: number) => string;
    info: (message: string, duration?: number) => string;
    remove: (id: string) => void;
    clear: () => void;
};
//# sourceMappingURL=useToast.d.ts.map