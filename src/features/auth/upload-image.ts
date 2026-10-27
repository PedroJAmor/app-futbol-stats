const MAX_BYTES = 5 * 1024 * 1024;
export class ImageInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function validateImageData(value: unknown): string {
  if (typeof value !== "string") throw new ImageInputError("No se recibió una imagen válida.");
  if (value.length > Math.ceil(MAX_BYTES / 3) * 4 + 40) throw new ImageInputError("La imagen supera los 5 MB.", 413);
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new ImageInputError("La foto debe ser JPG, PNG o WebP en base64 válido.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) throw new ImageInputError("La imagen supera los 5 MB.", 413);
  if (bytes.toString("base64") !== match[2]) throw new ImageInputError("La imagen contiene base64 inválido.");
  const signature = match[1] === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!signature) throw new ImageInputError("El contenido de la foto no coincide con su formato.");
  return value;
}
