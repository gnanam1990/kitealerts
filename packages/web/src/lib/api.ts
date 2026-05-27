const API_UNAVAILABLE = "KiteAlerts API is not configured for this Vercel preview yet.";
const CONFIGURED_BASE = (import.meta.env.VITE_API as string | undefined)?.trim();
const BASE = CONFIGURED_BASE ? CONFIGURED_BASE.replace(/\/$/, "") : null;

function apiUrl(path: string): string {
  if (!BASE) throw new Error(API_UNAVAILABLE);
  return `${BASE}${path}`;
}

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

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(API_UNAVAILABLE);
  }
  return (await response.json()) as T;
}

export async function listRules(): Promise<Rule[]> {
  const r = await fetch(apiUrl("/rules"));
  const data = await readJson<{ rules: Rule[] }>(r);
  return data.rules ?? [];
}

export async function createRule(rule: Omit<Rule, "id" | "active" | "created_at" | "last_seen_block">): Promise<Rule | null> {
  const r = await fetch(apiUrl("/rules"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!r.ok) return null;
  const data = await readJson<{ rule: Rule }>(r);
  return data.rule;
}

export async function deleteRule(id: string) {
  await fetch(apiUrl(`/rules/${id}`), { method: "DELETE" });
}

export async function toggleRule(id: string) {
  await fetch(apiUrl(`/rules/${id}/toggle`), { method: "POST" });
}

export async function listDeliveries(id: string): Promise<Delivery[]> {
  const r = await fetch(apiUrl(`/rules/${id}/deliveries`));
  const data = await readJson<{ deliveries: Delivery[] }>(r);
  return data.deliveries ?? [];
}
