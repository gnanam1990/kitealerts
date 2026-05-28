import { Hono } from "hono";
import { db } from "../lib/db";
import type { Rule, MatchType } from "../lib/types";
import { requireWriteAuth } from "../lib/auth";
import { validateWebhookUrl } from "../lib/webhook-url";
import crypto from "node:crypto";

const ALLOWED: MatchType[] = ["address_receives", "address_sends", "contract_called"];

const rules = new Hono();

rules.get("/", (c) => {
  const list = db.prepare("SELECT * FROM rules ORDER BY created_at DESC").all() as Rule[];
  return c.json({ rules: list });
});

rules.post("/", requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "invalid body" }, 400);

  const { name, match_type, address, min_value_wei, webhook_url } = body as Record<string, string>;
  if (!name || !match_type || !address || !webhook_url) {
    return c.json({ error: "name, match_type, address, webhook_url are required" }, 400);
  }
  if (!ALLOWED.includes(match_type as MatchType)) {
    return c.json({ error: `match_type must be one of ${ALLOWED.join(", ")}` }, 400);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return c.json({ error: "invalid address" }, 400);
  }
  if (min_value_wei && !/^\d+$/.test(min_value_wei)) {
    return c.json({ error: "min_value_wei must be an integer string" }, 400);
  }
  const webhook = await validateWebhookUrl(webhook_url);
  if (!webhook.ok) {
    return c.json({ error: webhook.reason }, 400);
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO rules (id, name, match_type, address, min_value_wei, webhook_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, match_type, address.toLowerCase(), min_value_wei ?? null, webhook.url);

  const rule = db.prepare("SELECT * FROM rules WHERE id = ?").get(id);
  return c.json({ rule }, 201);
});

rules.delete("/:id", requireWriteAuth, (c) => {
  const id = c.req.param("id");
  db.prepare("DELETE FROM rules WHERE id = ?").run(id);
  db.prepare("DELETE FROM deliveries WHERE rule_id = ?").run(id);
  return c.json({ ok: true });
});

rules.post("/:id/toggle", requireWriteAuth, (c) => {
  const id = c.req.param("id");
  db.prepare("UPDATE rules SET active = 1 - active WHERE id = ?").run(id);
  const rule = db.prepare("SELECT * FROM rules WHERE id = ?").get(id);
  return c.json({ rule });
});

rules.get("/:id/deliveries", (c) => {
  const id = c.req.param("id");
  const rows = db
    .prepare("SELECT * FROM deliveries WHERE rule_id = ? ORDER BY delivered_at DESC LIMIT 50")
    .all(id);
  return c.json({ deliveries: rows });
});

export default rules;
