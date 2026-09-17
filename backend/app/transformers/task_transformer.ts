import type Task from '#models/task'
import AssigneeTransformer from '#transformers/assignee_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: AssigneeTransformer.transform(this.resource.assignee),
    }
  }
}
