const { DateTime } = require("luxon");

// Default timezone for Kisumu, Kenya
const DEFAULT_EXAM_TIME_ZONE = "Africa/Nairobi";

/**
 * Convert a local date & time (in a given IANA timezone)
 * into an ISO string in UTC to save to MySQL.
 *
 * @param {string} localDateTime - e.g. "2025-11-18T12:00"
 * @param {string} [timeZone] - IANA timezone, e.g. "Africa/Nairobi"
 * @returns {string} ISO string in UTC, e.g. "2025-11-18T09:00:00.000Z"
 */
function localToUtcISO(localDateTime, timeZone = DEFAULT_EXAM_TIME_ZONE) {
  const dt = DateTime.fromISO(localDateTime, { zone: timeZone });

  if (!dt.isValid) {
    throw new Error(`Invalid localDateTime or timeZone: ${dt.invalidReason}`);
  }

  return dt.toUTC().toISO();
}

/**
 * Convert a UTC ISO string from MySQL into a local datetime
 * in the given timezone (for debugging / admin display).
 *
 * @param {string} utcISOString - e.g. "2025-11-18T09:00:00.000Z"
 * @param {string} [timeZone] - e.g. "Africa/Nairobi"
 * @returns {string} Local ISO string, e.g. "2025-11-18T12:00:00.000+03:00"
 */
function utcToLocalISO(utcISOString, timeZone = DEFAULT_EXAM_TIME_ZONE) {
  const dt = DateTime.fromISO(utcISOString, { zone: "utc" });

  if (!dt.isValid) {
    throw new Error(`Invalid utcISOString: ${dt.invalidReason}`);
  }

  return dt.setZone(timeZone).toISO();
}

module.exports = {
  DEFAULT_EXAM_TIME_ZONE,
  localToUtcISO,
  utcToLocalISO,
};