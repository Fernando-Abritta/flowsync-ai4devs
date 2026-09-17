/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/** Valores con los que viaja el estado por la API. Las etiquetas en castellano viven en `lib/task-status.ts`. */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

/**
 * Espejo de `AssigneeTransformer` del backend: de la persona responsable solo
 * llegan estos dos datos, a propósito.
 */
export type Assignee = {
  id: number
  fullName: string | null
}

/** Espejo de `TaskTransformer` del backend. */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: Assignee
}

export type CreateTaskPayload = {
  title: string
}
