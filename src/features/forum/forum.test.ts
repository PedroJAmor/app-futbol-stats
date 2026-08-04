import { describe, expect, it } from "vitest";
import { extractMatchMentionRefs } from "./mentions";
import { getRateLimitBucketStart, hashAnonymousFingerprint } from "./rate-limit";
import { forumPostSchema } from "./schemas";

describe("anonymous forum", () => {
  it("detecta honeypot y valida texto", () => {
    expect(forumPostSchema.parse({ text: "hola", website: "" }).website).toBe("");
    expect(forumPostSchema.parse({ text: "hola", website: "spam" }).website).toBe("spam");
    expect(() => forumPostSchema.parse({ text: "" })).toThrow();
  });
  it("hashea fingerprint sin conservar IP ni user agent", () => {
    const hash = hashAnonymousFingerprint("127.0.0.1", "test-agent", "secret");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("127.0.0.1");
    expect(getRateLimitBucketStart(610_000, 600_000).getTime()).toBe(600_000);
  });
  it("parsea tokens estables de partidos", () => {
    expect(extractMatchMentionRefs("uno @[match:56:tkn_abcd1234] dos @[match:7:tkn_xyz]")).toEqual([
      { matchId: 56, token: "tkn_abcd1234" },
      { matchId: 7, token: "tkn_xyz" },
    ]);
  });
});
