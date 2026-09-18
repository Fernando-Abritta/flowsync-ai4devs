import vine from '@vinejs/vine'

/**
 * A calendar date without time, accepted only as `YYYY-MM-DD`. The single
 * format keeps VineJS strict: `2026-02-30`, `2026-9-1`, `18/09/2026` or an
 * ISO string with a time all fail the `date` rule.
 */
export const calendarDate = () => vine.date({ formats: ['YYYY-MM-DD'] })
