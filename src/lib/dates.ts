import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function argentinaFormToUtc(date: string, time: string): Date {
  if (!isCalendarDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
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

export function formatArgentinaMatchDate(date: Date | string) {
  const text = formatInTimeZone(date, ARGENTINA_TIME_ZONE, "EEEE dd/MM/yyyy HH:mm", { locale: es });
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

export function toArgentinaFormValues(date: Date | string) {
  return {
    date: formatInTimeZone(date, ARGENTINA_TIME_ZONE, "yyyy-MM-dd"),
    time: formatInTimeZone(date, ARGENTINA_TIME_ZONE, "HH:mm"),
  };
}
