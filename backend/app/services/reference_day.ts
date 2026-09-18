import { clientDateValidator } from '#validators/client_date'
import type { HttpRequest } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const CLIENT_DATE_HEADER = 'x-client-date'

/**
 * Resolves the calendar day the overdue verdict is computed against: the day
 * the client declares in `X-Client-Date`, or today's UTC day when the header
 * is absent. A malformed header fails validation like any body field, so the
 * response is the usual 422 with `rule: "date"` and `field: "clientDate"`.
 * VineJS already hands the day back as a luxon `DateTime` (see start/validator.ts).
 */
export async function referenceDayFrom(request: HttpRequest): Promise<DateTime> {
  const { clientDate } = await clientDateValidator.validate({
    clientDate: request.header(CLIENT_DATE_HEADER),
  })

  return clientDate ?? DateTime.utc().startOf('day')
}
