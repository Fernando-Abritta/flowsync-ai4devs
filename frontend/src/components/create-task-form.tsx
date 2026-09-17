import { useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELDS = ['title'] as const

const BLANK_TITLE_MESSAGE = 'Escribe un título para la tarea.'

type CreateTaskFormProps = {
  /** Crea la tarea en el servidor; el formulario solo pinta el resultado. */
  onCreate: (title: string) => Promise<void>
}

/**
 * Lo único que se pide para crear una tarea es el título: ni responsable, ni
 * estado, ni fecha. La persona que crea queda como responsable en el backend.
 */
export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)
  const [title, setTitle] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    // Un título en blanco no merece un viaje al servidor; el backend lo
    // rechazaría igual, con el mismo mensaje.
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      failWith('title', BLANK_TITLE_MESSAGE)
      return
    }

    // El campo solo se vacía si el servidor ha creado la tarea: si falla, el
    // título escrito se conserva para corregirlo o reintentar.
    return submit(async () => {
      await onCreate(trimmedTitle)
      setTitle('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="title"
            name="title"
            autoComplete="off"
            placeholder="Preparar la demo del viernes"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear tarea'}
          </Button>
        </div>
        <FieldError id="title-error" message={fieldErrors.title} />
      </div>
    </form>
  )
}
