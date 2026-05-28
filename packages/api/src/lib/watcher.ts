import { db } from "./db";
import { getAddressTxs, type ScanTx } from "./kitescan";
import type { Rule } from "./types";
import { validateWebhookUrl } from "./webhook-url";

const POLL_MS = Number(process.env.WATCHER_POLL_MS ?? 30_000);
const WEBHOOK_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS ?? 10_000);
const WEBHOOK_MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 3);
const WEBHOOK_BACKOFF_BASE_MS = Number(process.env.WEBHOOK_BACKOFF_BASE_MS ?? 30_000);

interface DeliveryRow {
  id: number;
  status: string;
  attempts: number;
  next_attempt_at: number | null;
}

function ruleMatches(rule: Rule, tx: ScanTx): boolean {
  const addr = rule.address.toLowerCase();
  const from = tx.from?.hash?.toLowerCase();
  const to = tx.to?.hash?.toLowerCase();
  if (tx.status !== "ok") return false;
  if (rule.match_type === "address_receives" && to !== addr) return false;
  if (rule.match_type === "address_sends" && from !== addr) return false;
  if (rule.match_type === "contract_called" && to !== addr) return false;
  if (rule.min_value_wei) {
    try {
      if (BigInt(tx.value) < BigInt(rule.min_value_wei)) return false;
    } catch {
      // skip on parse error
    }
  }
  return true;
}

async function deliver(rule: Rule, tx: ScanTx) {
  const existing = db
    .prepare("SELECT id, status, attempts, next_attempt_at FROM deliveries WHERE rule_id = ? AND tx_hash = ?")
    .get(rule.id, tx.hash) as DeliveryRow | undefined;
  if (existing?.status === "ok") return;
  if (existing?.next_attempt_at && existing.next_attempt_at > Date.now()) return;
  if ((existing?.attempts ?? 0) >= WEBHOOK_MAX_ATTEMPTS) return;

  const payload = {
    rule_id: rule.id,
    rule_name: rule.name,
    match_type: rule.match_type,
    address: rule.address,
    tx: {
      hash: tx.hash,
      block_number: tx.block_number,
      timestamp: tx.timestamp,
      from: tx.from?.hash,
      to: tx.to?.hash,
      value_wei: tx.value,
      method: tx.method,
    },
    delivered_at: new Date().toISOString(),
  };

  const attempt = (existing?.attempts ?? 0) + 1;
  const now = Date.now();
  const webhook = await validateWebhookUrl(rule.webhook_url);
  if (!webhook.ok) {
    upsertDelivery(existing, rule.id, tx.hash, {
      status: "failed",
      attempts: attempt,
      error: webhook.reason,
      httpStatus: null,
      nextAttemptAt: null,
      attemptedAt: now,
    });
    return;
  }

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "KiteAlerts/0.1" },
      redirect: "manual",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      body: JSON.stringify(payload),
    });
    upsertDelivery(existing, rule.id, tx.hash, {
      status: res.ok ? "ok" : "failed",
      attempts: attempt,
      error: res.ok ? null : `HTTP ${res.status}`,
      httpStatus: res.status,
      nextAttemptAt: res.ok ? null : nextAttemptAt(attempt),
      attemptedAt: now,
    });
  } catch (e) {
    upsertDelivery(existing, rule.id, tx.hash, {
      status: "failed",
      attempts: attempt,
      error: (e as Error).message,
      httpStatus: null,
      nextAttemptAt: nextAttemptAt(attempt),
      attemptedAt: now,
    });
  }
}

function nextAttemptAt(attempt: number): number | null {
  if (attempt >= WEBHOOK_MAX_ATTEMPTS) return null;
  return Date.now() + Math.min(5 * 60_000, WEBHOOK_BACKOFF_BASE_MS * 2 ** (attempt - 1));
}

function upsertDelivery(
  existing: DeliveryRow | undefined,
  ruleId: string,
  txHash: string,
  result: {
    status: "ok" | "failed";
    attempts: number;
    error: string | null;
    httpStatus: number | null;
    nextAttemptAt: number | null;
    attemptedAt: number;
  }
) {
  if (existing) {
    db.prepare(
      `UPDATE deliveries
       SET status = ?, http_status = ?, error = ?, attempts = ?, next_attempt_at = ?, last_attempt_at = ?, delivered_at = ?
       WHERE id = ?`
    ).run(
      result.status,
      result.httpStatus,
      result.error,
      result.attempts,
      result.nextAttemptAt,
      result.attemptedAt,
      result.attemptedAt,
      existing.id
    );
    return;
  }

  db.prepare(
    `INSERT INTO deliveries
      (rule_id, tx_hash, status, http_status, error, attempts, next_attempt_at, last_attempt_at, delivered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ruleId,
    txHash,
    result.status,
    result.httpStatus,
    result.error,
    result.attempts,
    result.nextAttemptAt,
    result.attemptedAt,
    result.attemptedAt
  );
}

async function tickOnce() {
  const rules = db.prepare("SELECT * FROM rules WHERE active = 1").all() as Rule[];
  for (const rule of rules) {
    try {
      const txs = await getAddressTxs(rule.address);
      const matched = txs.filter((tx) => ruleMatches(rule, tx));
      for (const tx of matched) {
        if (tx.block_number > rule.last_seen_block) {
          await deliver(rule, tx);
        }
      }
      const newest = txs.reduce((m, tx) => Math.max(m, tx.block_number), rule.last_seen_block);
      if (newest > rule.last_seen_block) {
        db.prepare("UPDATE rules SET last_seen_block = ? WHERE id = ?").run(newest, rule.id);
      }
    } catch (e) {
      console.error(`watcher rule ${rule.id} error:`, (e as Error).message);
    }
  }
}

export function startWatcher() {
  console.log(`KiteAlerts watcher polling every ${POLL_MS}ms`);
  void tickOnce();
  setInterval(() => void tickOnce(), POLL_MS);
}
