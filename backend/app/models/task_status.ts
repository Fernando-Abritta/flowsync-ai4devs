/**
 * Closed set of task statuses. These are the values that travel through
 * the API; the UI labels live in the frontend.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const DEFAULT_TASK_STATUS: TaskStatus = 'pending'
