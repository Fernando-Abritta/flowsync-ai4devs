import type {
  AuthResult,
  CreateTaskPayload,
  LoginPayload,
  SignupPayload,
  Task,
  UpdateTaskPayload,
  User,
} from '@/lib/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

/** Forma de cada error que devuelve el backend: `{ errors: [...] }`. */
type BackendError = {
  message: string
  rule?: string
  field?: string
  meta?: Record<string, unknown>
}

/**
 * Error de API con el mensaje ya traducido y listo para pintar, más los errores
 * desglosados por campo para colocarlos bajo su input correspondiente.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'el nombre',
  email: 'el email',
  password: 'la contraseña',
  passwordConfirmation: 'la confirmación de la contraseña',
  title: 'el título',
  dueDate: 'la fecha de vencimiento',
}

/**
 * La cabecera `X-Client-Date` solo puede fallar por un bug del cálculo del día
 * local o por un reloj del equipo imposible; como ese 422 tumba también la
 * carga de la lista, merece un mensaje accionable en vez de «Revisa el campo.».
 */
const CLIENT_DATE_MESSAGE =
  'No se ha podido determinar la fecha de hoy. Comprueba la fecha y la hora del equipo.'

const label = (field?: string) => FIELD_LABELS[field ?? ''] ?? 'el campo'

/**
 * El título de una tarea tiene sus propias frases: la genérica («Falta rellenar
 * el título.») no invita a escribirlo. Por HTTP un título vacío o en blanco
 * llega como `required`; `minLength` solo saltaría fuera de la petición.
 */
function translateTitle(rule?: string): string | undefined {
  switch (rule) {
    case 'required':
    case 'minLength':
      return 'Escribe un título para la tarea.'
    case 'maxLength':
      return 'El título no puede superar los 200 caracteres.'
    default:
      return undefined
  }
}

/**
 * Traduce un error de VineJS a una frase que el usuario pueda entender.
 * Cubre todas las reglas que usan `app/validators/user.ts` y
 * `app/validators/task.ts` en el backend.
 */
function translate(error: BackendError): string {
  const { rule, field, meta } = error

  if (field === 'title') {
    const specific = translateTitle(rule)
    if (specific) return specific
  }

  if (field === 'clientDate') return CLIENT_DATE_MESSAGE

  switch (rule) {
    case 'database.unique':
      return field === 'email'
        ? 'Ese email ya está registrado. Inicia sesión en su lugar.'
        : `Ya existe un registro con ${label(field)}.`
    case 'sameAs':
      return 'Las contraseñas no coinciden.'
    case 'email':
      return 'Introduce una dirección de email válida.'
    case 'date':
      return 'Introduce una fecha válida.'
    case 'required':
      return `Falta rellenar ${label(field)}.`
    case 'minLength':
      return `${label(field)} debe tener al menos ${meta?.min} caracteres.`
    case 'maxLength':
      return `${label(field)} no puede superar los ${meta?.max} caracteres.`
    default:
      return `Revisa ${label(field)}.`
  }
}

/**
 * Convierte una respuesta de error del backend en un `ApiError`.
 */
function toApiError(status: number, body: unknown): ApiError {
  const errors = (body as { errors?: BackendError[] } | null)?.errors

  if (status === 401) {
    return new ApiError(
      'Tu sesión ha caducado. Vuelve a iniciar sesión.',
      status,
    )
  }

  // `User.verifyCredentials` lanza E_INVALID_CREDENTIALS con un 400 sin `field`.
  if (status === 400) {
    return new ApiError('El email o la contraseña no son correctos.', status)
  }

  // `findOrFail` sobre un id que ya no existe (otra persona recargó antes).
  if (status === 404) {
    return new ApiError(
      'Eso ya no existe en el servidor. Recarga la página para ver la lista al día.',
      status,
    )
  }

  if (status === 422 && errors?.length) {
    const fieldErrors: Record<string, string> = {}
    for (const error of errors) {
      if (error.field && !fieldErrors[error.field]) {
        fieldErrors[error.field] = translate(error)
      }
    }

    return new ApiError(translate(errors[0]), status, fieldErrors)
  }

  return new ApiError(
    'Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.',
    status,
  )
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
}

async function request<T>(
  path: string,
  {
    method = 'GET',
    body,
    token,
    headers: extraHeaders = {},
  }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extraHeaders,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Comprueba que el backend está arrancado.',
      0,
    )
  }

  // Un 500 puede responder HTML, así que el parseo no puede darse por hecho.
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response.status, payload)
  }

  return payload as T
}

export function signup(payload: SignupPayload): Promise<AuthResult> {
  return request<{ data: AuthResult }>('/api/v1/auth/signup', {
    method: 'POST',
    body: payload,
  }).then((response) => response.data)
}

export function login(payload: LoginPayload): Promise<AuthResult> {
  return request<{ data: AuthResult }>('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  }).then((response) => response.data)
}

export function getProfile(token: string): Promise<User> {
  return request<{ data: User }>('/api/v1/account/profile', { token }).then(
    (response) => response.data,
  )
}

export function logout(token: string): Promise<void> {
  return request('/api/v1/account/logout', { method: 'POST', token }).then(
    () => undefined,
  )
}

/**
 * Día de calendario local del navegador como `AAAA-MM-DD`. Se construye con
 * los getters locales, nunca con `toISOString`, que daría el día en UTC y
 * cambiaría de día a otra hora que el reloj de la persona.
 */
function localCalendarDay(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Toda petición de tareas declara el día de quien mira: el servidor calcula
 * `isOverdue` contra él. Se calcula en cada petición, no al cargar el módulo,
 * para que una pestaña abierta durante días siga enviando el día correcto.
 */
function taskRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: { ...options.headers, 'X-Client-Date': localCalendarDay() },
  })
}

export function listTasks(token: string): Promise<Task[]> {
  return taskRequest<{ data: Task[] }>('/api/v1/tasks', { token }).then(
    (response) => response.data,
  )
}

export function getTask(token: string, id: number | string): Promise<Task> {
  return taskRequest<{ data: Task }>(`/api/v1/tasks/${id}`, { token }).then(
    (response) => response.data,
  )
}

export function createTask(
  token: string,
  payload: CreateTaskPayload,
): Promise<Task> {
  return taskRequest<{ data: Task }>('/api/v1/tasks', {
    method: 'POST',
    body: payload,
    token,
  }).then((response) => response.data)
}

/** `PATCH` parcial: solo viajan las claves del `patch`; el título y el responsable no se tocan. */
export function updateTask(
  token: string,
  id: number,
  patch: UpdateTaskPayload,
): Promise<Task> {
  return taskRequest<{ data: Task }>(`/api/v1/tasks/${id}`, {
    method: 'PATCH',
    body: patch,
    token,
  }).then((response) => response.data)
}
