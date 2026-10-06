const DEFAULT_TIMEZONE = "UTC";

/**
 * Zona horaria de los logs de arranque. Configurable con `TZ` (y, por
 * compatibilidad con literales de IANA, `APP_TIMEZONE`). Antes se fijaba a
 * `America/Guayaquil`, lo que hacía que el proyecto no fuera portable.
 */
export const getTimezone = (): string =>
  process.env.APP_TIMEZONE?.trim() || process.env.TZ?.trim() || DEFAULT_TIMEZONE;

export const getFormattedDate = (): string =>
  new Date().toLocaleString("es-EC", { timeZone: getTimezone() });