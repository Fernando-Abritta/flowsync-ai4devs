import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertCircleIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import { TASK_STATUS_LABELS } from '@/lib/task-status'
import type { Task } from '@/lib/types'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const INCOMPLETE_DATE_MESSAGE = 'La fecha no es válida o está incompleta.'
const MISSING_TASK_MESSAGE = 'Esta tarea no existe o se ha eliminado.'

/**
 * Una única tarea, en solo lectura salvo por su fecha de vencimiento. El
 * campo se guarda solo al cambiar: con un `<input type="date">` nativo el
 * `change` solo llega con una fecha completa o con el campo vaciado, que son
 * justo los dos momentos en que hay algo que enviar. La señal «Vencida» es
 * la que devuelve el servidor; aquí no se compara ninguna fecha con hoy.
 */
export function TaskPage() {
  const { token } = useAuth()
  const { id } = useParams()
  // `null` mientras la tarea no ha llegado o no existe.
  const [task, setTask] = useState<Task | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setSaving] = useState(false)
  // Bajo el campo: fecha incompleta o rechazo de validación del servidor.
  const [dateError, setDateError] = useState<string | null>(null)
  // Aviso general: el servidor no responde o falla por otra causa.
  const [saveError, setSaveError] = useState<string | null>(null)
  // Cada guardado fallido remonta el campo para que vuelva a mostrar la fecha
  // que sigue vigente en el servidor.
  const [discardedEdits, setDiscardedEdits] = useState(0)

  useEffect(() => {
    if (!token || id === undefined) return

    let cancelled = false

    api
      .getTask(token, id)
      .then((loaded) => {
        if (!cancelled) setTask(loaded)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setLoadError(MISSING_TASK_MESSAGE)
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'No se ha podido cargar la tarea.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, id])

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  if (!token) return null

  const handleDueDateChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!task) return
    const input = event.target

    setDateError(null)
    setSaveError(null)

    // Vacío con `badInput`: lo escrito no forma una fecha; vacío sin él: la
    // persona ha vaciado el campo y quiere quitar la fecha.
    if (input.value === '' && input.validity.badInput) {
      setDateError(INCOMPLETE_DATE_MESSAGE)
      return
    }

    const dueDate = input.value === '' ? null : input.value

    setSaving(true)
    try {
      const updated = await api.updateTask(token, task.id, { dueDate })
      setTask(updated)
    } catch (caught) {
      setDiscardedEdits((count) => count + 1)
      if (caught instanceof ApiError && caught.fieldErrors.dueDate) {
        setDateError(caught.fieldErrors.dueDate)
      } else {
        setSaveError(
          caught instanceof ApiError
            ? caught.message
            : 'Algo ha ido mal. Inténtalo de nuevo.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">FlowSync</p>
            <h1 className="text-2xl font-semibold tracking-tight">Tarea</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/tasks">Volver a la lista</Link>
          </Button>
        </header>

        {loadError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {task === null && !loadError && (
          <div
            className="text-muted-foreground flex items-center gap-2 py-6 text-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="size-4 animate-spin" />
            Cargando la tarea…
          </div>
        )}

        {task && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="break-words">{task.title}</CardTitle>
                {task.isOverdue && (
                  <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                    Vencida
                  </span>
                )}
              </div>
              <CardDescription>
                {task.assignee.fullName ?? 'Sin nombre'} ·{' '}
                {TASK_STATUS_LABELS[task.status]}
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              {saveError && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="due-date">Fecha de vencimiento</Label>
                <Input
                  key={`${task.dueDate ?? ''}-${discardedEdits}`}
                  id="due-date"
                  name="dueDate"
                  type="date"
                  defaultValue={task.dueDate ?? ''}
                  disabled={isSaving}
                  onChange={handleDueDateChange}
                  aria-invalid={Boolean(dateError)}
                  aria-describedby={dateError ? 'due-date-error' : undefined}
                  className="sm:max-w-xs"
                />
                <FieldError
                  id="due-date-error"
                  message={dateError ?? undefined}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
