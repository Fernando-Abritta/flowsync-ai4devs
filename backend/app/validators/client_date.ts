import vine from '@vinejs/vine'
import { calendarDate } from '#validators/calendar_date'

/**
 * Validates the `X-Client-Date` header, the calendar day the client is on.
 * The field is named after the header so a failure reports
 * `field: "clientDate"` and never gets mistaken for a body field.
 */
export const clientDateValidator = vine.create({
  clientDate: calendarDate().optional(),
})
