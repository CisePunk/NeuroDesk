import { apiFetch } from './http';

export function getModuli() {
    return apiFetch('/api/moduli');
}

export function createModulo(modulo) {
    return apiFetch('/api/moduli', { method: 'POST', body: modulo });
}
