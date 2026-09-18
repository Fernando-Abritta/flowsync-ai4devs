import type Task from '#models/task'
import AssigneeTransformer from '#transformers/assignee_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DateTime } from 'luxon'

/**
 * The overdue verdict is computed on every read against the day the
 * request declared, so the transformer receives it instead of reading a
 * clock: `TaskTransformer.transform(task, referenceDay)`.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  constructor(
    resource: Task,
    private readonly referenceDay: DateTime
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.referenceDay),
      assignee: AssigneeTransformer.transform(this.resource.assignee),
    }
  }
}
