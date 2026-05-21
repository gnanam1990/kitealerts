const BASE = (import.meta.env.VITE_API ?? "/api") as string;

export type MatchType = "address_receives" | "address_sends" | "contract_called";

export interface Rule {
  id: string;
  name: string;
  match_type: MatchType;
  address: string;
  min_value_wei: string | null;
  webhook_url: string;
  active: 0 | 1;
  created_at: number;
  last_seen_block: number;
}

export interface Delivery {
  id: number;
  rule_id: string;
  tx_hash: string;
  status: string;
  http_status: number | null;
  error: string | null;
  delivered_at: number;
}

export async function listRules(): Promise<Rule[]> {
  const r = await fetch(`${BASE}/rules`);
  const data = (await r.json()) as { rules: Rule[] };
  return data.rules ?? [];
}

export async function createRule(rule: Omit<Rule, "id" | "active" | "created_at" | "last_seen_block">): Promise<Rule | null> {
  const r = await fetch(`${BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { rule: Rule };
  return data.rule;
}

export async function deleteRule(id: string) {
  await fetch(`${BASE}/rules/${id}`, { method: "DELETE" });
}

export async function toggleRule(id: string) {
  await fetch(`${BASE}/rules/${id}/toggle`, { method: "POST" });
}

export async function listDeliveries(id: string): Promise<Delivery[]> {
  const r = await fetch(`${BASE}/rules/${id}/deliveries`);
  const data = (await r.json()) as { deliveries: Delivery[] };
  return data.deliveries ?? [];
}
