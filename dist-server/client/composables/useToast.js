"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToast = useToast;
const vue_1 = require("vue");
const toasts = (0, vue_1.ref)([]);
let toastId = 0;
function useToast() {
    const show = (message, type = 'info', duration = 5000) => {
        const id = `toast-${++toastId}`;
        const toast = { id, type, message, duration };
        toasts.value.push(toast);
        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
        return id;
    };
    const success = (message, duration) => show(message, 'success', duration);
    const error = (message, duration) => show(message, 'error', duration);
    const warning = (message, duration) => show(message, 'warning', duration);
    const info = (message, duration) => show(message, 'info', duration);
    const remove = (id) => {
        const index = toasts.value.findIndex((t) => t.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    };
    const clear = () => {
        toasts.value = [];
    };
    return {
        toasts: (0, vue_1.readonly)(toasts),
        show,
        success,
        error,
        warning,
        info,
        remove,
        clear
    };
}
//# sourceMappingURL=useToast.js.map