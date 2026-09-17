import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { CreateTaskForm } from '@/components/create-task-form'
import { TaskRow } from '@/components/task-row'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const EMPTY_LIST_MESSAGE =
  'Todavía no hay tareas. Escribe un título arriba para crear la primera.'

/**
 * La lista compartida del equipo: la misma para todas las personas. Se carga
 * una vez al entrar y después se mantiene en memoria con lo que el servidor
 * devuelve en cada escritura; nada se pinta antes de que lo confirme.
 */
export function TasksPage() {
  const { token } = useAuth()
  // `null` mientras la lista no ha llegado; a partir de ahí, siempre un array.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        if (!cancelled) setTasks(list)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No se ha podido cargar la lista de tareas.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  if (!token) return null

  const handleCreate = async (title: string) => {
    const created = await api.createTask(token, { title })
    // Al final y en el orden recibido: la lista no tiene criterio de orden
    // decidido y no se reordena bajo los pies de nadie.
    setTasks((current) => [...(current ?? []), created])
  }

  const handleStatusChange = async (id: number, status: TaskStatus) => {
    const updated = await api.updateTaskStatus(token, id, status)
    setTasks(
      (current) =>
        current?.map((task) => (task.id === updated.id ? updated : task)) ??
        current,
    )
  }

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">FlowSync</p>
            <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">Perfil</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nueva tarea</CardTitle>
            <CardDescription>
              Solo hace falta el título. Nace pendiente y a tu nombre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTaskForm onCreate={handleCreate} />
          </CardContent>
        </Card>

        <section aria-labelledby="task-list-heading" className="grid gap-3">
          <h2 id="task-list-heading" className="text-lg font-semibold">
            Lista del equipo
          </h2>

          {loadError && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {tasks === null && !loadError && (
            <div
              className="text-muted-foreground flex items-center gap-2 py-6 text-sm"
              role="status"
              aria-live="polite"
            >
              <Loader2Icon className="size-4 animate-spin" />
              Cargando tareas…
            </div>
          )}

          {tasks?.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {EMPTY_LIST_MESSAGE}
            </p>
          )}

          {tasks && tasks.length > 0 && (
            <ul className="grid gap-3">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={(status) =>
                    handleStatusChange(task.id, status)
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
