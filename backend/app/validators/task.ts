import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task_status'

export const TASK_TITLE_MAX_LENGTH = 200

/**
 * The title is trimmed before any rule runs, so a blank title fails
 * `minLength` and the stored value never carries surrounding spaces.
 */
const title = () => vine.string().trim().minLength(1).maxLength(TASK_TITLE_MAX_LENGTH)

/**
 * Validator to use when creating a task. Only the title is accepted:
 * status and assignee are always derived on the server.
 */
export const createTaskValidator = vine.create({
  title: title(),
})

/**
 * Validator to use when updating a task. Both fields are optional so the
 * body can be partial; the controller rejects a body with neither.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional(),
})
