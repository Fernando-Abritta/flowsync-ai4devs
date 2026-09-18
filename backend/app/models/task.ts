import { TaskSchema } from '#database/schema'
import User from '#models/user'
import type { TaskStatus } from '#models/task_status'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'

export default class Task extends TaskSchema {
  declare status: TaskStatus

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * The single definition of "overdue": the task has a due date, that date
   * is a calendar day before `referenceDay`, and the task is not done.
   * Days are compared as `YYYY-MM-DD`, never as instants, so the verdict
   * does not depend on the zone either date was built in.
   */
  isOverdueOn(referenceDay: DateTime): boolean {
    if (!this.dueDate || this.status === 'done') return false

    return this.dueDate.toISODate()! < referenceDay.toISODate()!
  }
}
