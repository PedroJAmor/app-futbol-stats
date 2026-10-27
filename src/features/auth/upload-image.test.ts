import { expect, it } from "vitest";
import { validateImageData } from "./upload-image";
it("acepta firmas de JPG PNG y WebP", () => {
  for (const [type, bytes] of [["jpeg", [255, 216, 255]], ["png", [137, 80, 78, 71, 13, 10, 26, 10]], ["webp", Array.from(Buffer.from("RIFF0000WEBP"))]] as const) {
    const value = `data:image/${type};base64,${Buffer.from(bytes).toString("base64")}`;
    expect(validateImageData(value)).toBe(value);
  }
});
it.each([null, false, "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,hello", "data:image/jpeg;base64,YWJj", "data:image/png;base64,AA===", "data:image/png;base64,AB=="])("rechaza imagen inválida %s", input => expect(() => validateImageData(input)).toThrow());
it("rechaza más de 5 MB antes de decodificar", () => expect(() => validateImageData("a".repeat(7_000_000))).toThrow(expect.objectContaining({ status: 413 })));
