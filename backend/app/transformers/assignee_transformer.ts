import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * The task list only needs to name the assignee. Deliberately narrower than
 * UserTransformer so account data never leaks into task responses.
 */
export default class AssigneeTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName'])
  }
}
