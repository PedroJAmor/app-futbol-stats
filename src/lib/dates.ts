import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function argentinaFormToUtc(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Fecha u hora inválida");
  }
  const result = fromZonedTime(`${date}T${time}:00`, ARGENTINA_TIME_ZONE);
  if (Number.isNaN(result.getTime())) throw new Error("Fecha u hora inválida");
  return result;
}

export function formatArgentinaDate(date: Date | string) {
  return formatInTimeZone(date, ARGENTINA_TIME_ZONE, "dd/MM/yyyy");
}

export function formatArgentinaDateTime(date: Date | string) {
  return formatInTimeZone(date, ARGENTINA_TIME_ZONE, "dd/MM/yyyy HH:mm");
}

export function toArgentinaFormValues(date: Date | string) {
  return {
    date: formatInTimeZone(date, ARGENTINA_TIME_ZONE, "yyyy-MM-dd"),
    time: formatInTimeZone(date, ARGENTINA_TIME_ZONE, "HH:mm"),
  };
}
