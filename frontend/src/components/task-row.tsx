import { useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { TASK_STATUS_LABELS, TASK_STATUSES } from '@/lib/task-status'
import type { Task, TaskStatus } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type TaskRowProps = {
  task: Task
  /** Pide el cambio al servidor; la fila se repinta cuando llega la respuesta. */
  onStatusChange: (status: TaskStatus) => Promise<void>
}

/**
 * Una fila responde «quién está en qué»: título, nombre del responsable y
 * estado. Del responsable solo se pinta el nombre; nunca el email ni el id.
 */
export function TaskRow({ task, onStatusChange }: TaskRowProps) {
  const [isUpdating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeStatus = async (status: TaskStatus) => {
    // Pulsar el estado actual no es un cambio.
    if (status === task.status) return

    setUpdating(true)
    setError(null)
    try {
      await onStatusChange(status)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Algo ha ido mal. Inténtalo de nuevo.',
      )
    } finally {
      setUpdating(false)
    }
  }

  return (
    <li className="bg-card text-card-foreground grid gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium break-words">{task.title}</p>
          <p className="text-muted-foreground text-sm">
            {task.assignee.fullName ?? 'Sin nombre'}
          </p>
        </div>

        <div
          role="group"
          aria-label={`Estado de «${task.title}»`}
          className="flex shrink-0 flex-wrap gap-2"
        >
          {TASK_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === task.status ? 'default' : 'outline'}
              aria-pressed={status === task.status}
              disabled={isUpdating}
              onClick={() => changeStatus(status)}
            >
              {TASK_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </li>
  )
}
