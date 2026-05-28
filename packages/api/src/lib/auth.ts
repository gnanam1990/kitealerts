import crypto from "node:crypto";
import type { Context, Next } from "hono";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function requireWriteAuth(c: Context, next: Next) {
  const expected = process.env.KITEALERTS_WRITE_API_KEY?.trim();
  if (!expected) {
    return c.json({ error: "write API disabled: KITEALERTS_WRITE_API_KEY is not configured" }, 503);
  }

  const auth = c.req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token || !safeEqual(token, expected)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  await next();
}
