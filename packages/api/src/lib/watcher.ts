import { db } from "./db";
import { getAddressTxs, type ScanTx } from "./kitescan";
import type { Rule } from "./types";

const POLL_MS = Number(process.env.WATCHER_POLL_MS ?? 30_000);

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
  const already = db
    .prepare("SELECT 1 FROM deliveries WHERE rule_id = ? AND tx_hash = ?")
    .get(rule.id, tx.hash);
  if (already) return;

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

  try {
    const res = await fetch(rule.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "KiteAlerts/0.1" },
      body: JSON.stringify(payload),
    });
    db.prepare(
      "INSERT INTO deliveries (rule_id, tx_hash, status, http_status) VALUES (?, ?, ?, ?)"
    ).run(rule.id, tx.hash, res.ok ? "ok" : "failed", res.status);
  } catch (e) {
    db.prepare(
      "INSERT INTO deliveries (rule_id, tx_hash, status, error) VALUES (?, ?, 'failed', ?)"
    ).run(rule.id, tx.hash, (e as Error).message);
  }
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
