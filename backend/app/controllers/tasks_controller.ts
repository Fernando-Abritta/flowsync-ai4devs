import Task from '#models/task'
import { DEFAULT_TASK_STATUS } from '#models/task_status'
import { referenceDayFrom } from '#services/reference_day'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const referenceDay = await referenceDayFrom(request)
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, referenceDay))
  }

  async show({ params, request, serialize }: HttpContext) {
    const referenceDay = await referenceDayFrom(request)
    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, referenceDay))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const referenceDay = await referenceDayFrom(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)
    const creator = auth.getUserOrFail()

    const task = await Task.create({
      title,
      status: DEFAULT_TASK_STATUS,
      assigneeId: creator.id,
      dueDate: dueDate ?? null,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task, referenceDay))
  }

  async update({ params, request, serialize }: HttpContext) {
    const referenceDay = await referenceDayFrom(request)
    const task = await Task.findOrFail(params.id)
    const { status, assigneeId, dueDate } = await request.validateUsing(updateTaskValidator)

    // `dueDate === null` is a request to clear the date, only `undefined` is absence.
    if (status === undefined && assigneeId === undefined && dueDate === undefined) {
      throw new vineErrors.E_VALIDATION_ERROR([
        {
          message: 'The status, assigneeId or dueDate field must be provided',
          rule: 'required',
          field: 'status',
        },
      ])
    }

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    if (dueDate !== undefined) task.dueDate = dueDate
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, referenceDay))
  }
}
