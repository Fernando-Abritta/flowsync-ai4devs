import type { TaskStatus } from '@/lib/types'

/**
 * Único sitio del frontend donde un valor de estado se convierte en texto.
 * Los valores de la API son los identificadores; las etiquetas solo se pintan.
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/** Orden en que se ofrecen los estados en pantalla. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  'pending',
  'in_progress',
  'done',
]
