import Task from '#models/task'
import { DEFAULT_TASK_STATUS } from '#models/task_status'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const creator = auth.getUserOrFail()

    const task = await Task.create({ title, status: DEFAULT_TASK_STATUS, assigneeId: creator.id })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status, assigneeId } = await request.validateUsing(updateTaskValidator)

    if (status === undefined && assigneeId === undefined) {
      throw new vineErrors.E_VALIDATION_ERROR([
        {
          message: 'The status or the assigneeId field must be provided',
          rule: 'required',
          field: 'status',
        },
      ])
    }

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
