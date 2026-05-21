const API = "https://kitescan.ai/api/v2";

export interface ScanTx {
  hash: string;
  block_number: number;
  timestamp: string;
  from: { hash: string };
  to: { hash: string } | null;
  value: string;
  status: "ok" | "error" | null;
  method: string | null;
}

export async function getAddressTxs(address: string): Promise<ScanTx[]> {
  const r = await fetch(`${API}/addresses/${address}/transactions`, {
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new Error(`KiteScan ${r.status}`);
  const data = (await r.json()) as { items: ScanTx[] };
  return data.items ?? [];
}
