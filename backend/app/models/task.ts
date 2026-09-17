import { TaskSchema } from '#database/schema'
import User from '#models/user'
import type { TaskStatus } from '#models/task_status'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Task extends TaskSchema {
  declare status: TaskStatus

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
