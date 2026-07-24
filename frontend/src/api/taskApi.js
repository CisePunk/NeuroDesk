import { apiFetch } from './http';

export function getTask() {
    return apiFetch('/api/task');
}

export function createTask(task) {
    return apiFetch('/api/task', { method: 'POST', body: task });
}
