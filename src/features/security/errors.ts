import { NextResponse } from "next/server";

export class RequestSecurityError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) {
    super(message);
  }
}

export function securityErrorResponse(error: unknown) {
  if (!(error instanceof RequestSecurityError)) return null;
  return NextResponse.json({ error: error.message }, {
    status: error.status,
    headers: {
      "Cache-Control": "no-store",
      ...(error.retryAfter !== undefined && { "Retry-After": String(error.retryAfter) }),
    },
  });
}
