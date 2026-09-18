import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task_status'
import { calendarDate } from '#validators/calendar_date'

export const TASK_TITLE_MAX_LENGTH = 200

/**
 * The title is trimmed before any rule runs, so the stored value never
 * carries surrounding spaces. Over HTTP a blank title never reaches
 * `minLength`: the bodyparser turns empty strings into null, so it fails
 * `required` like a missing one. `minLength(1)` only guards direct callers.
 */
const title = () => vine.string().trim().minLength(1).maxLength(TASK_TITLE_MAX_LENGTH)

/**
 * The due date is a calendar day or nothing. `nullable` lets the client send
 * `null` (or an empty string, which the bodyparser turns into `null`) to
 * clear it; `optional` lets the body omit it altogether.
 */
const dueDate = () => calendarDate().nullable().optional()

/**
 * Validator to use when creating a task. The title and an optional due
 * date are accepted: status and assignee are always derived on the server.
 */
export const createTaskValidator = vine.create({
  title: title(),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. Every field is optional so the
 * body can be partial; the controller rejects a body with none of them.
 * The assignee id is strict so `true` or `"1"` are not coerced into an id.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  dueDate: dueDate(),
  assigneeId: vine
    .number({ strict: true })
    .withoutDecimals()
    .exists({ table: 'users', column: 'id' })
    .optional(),
})
