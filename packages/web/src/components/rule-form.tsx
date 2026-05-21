import { useState } from "react";
import { createRule, type MatchType } from "../lib/api";

const MATCH_LABELS: Record<MatchType, string> = {
  address_receives: "Address receives a transaction",
  address_sends: "Address sends a transaction",
  contract_called: "Contract is called",
};

export function RuleForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<MatchType>("address_receives");
  const [address, setAddress] = useState("");
  const [minValueWei, setMinValueWei] = useState("");
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid =
    name.trim() &&
    /^0x[a-fA-F0-9]{40}$/.test(address.trim()) &&
    /^https?:\/\//.test(webhook.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setErr(null);
    const r = await createRule({
      name: name.trim(),
      match_type: matchType,
      address: address.trim(),
      min_value_wei: minValueWei.trim() || null,
      webhook_url: webhook.trim(),
    });
    setBusy(false);
    if (!r) {
      setErr("Could not create rule");
      return;
    }
    setName("");
    setAddress("");
    setMinValueWei("");
    setWebhook("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-kite-border bg-kite-card p-5">
      <h2 className="text-base font-semibold text-kite-fg">New rule</h2>

      <Field label="Rule name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Treasury inbound"
          className="w-full px-3 py-2 rounded-md border border-kite-border bg-kite-bg text-sm focus:outline-none focus:border-kite-primary"
        />
      </Field>

      <Field label="Match">
        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value as MatchType)}
          className="w-full px-3 py-2 rounded-md border border-kite-border bg-kite-bg text-sm focus:outline-none focus:border-kite-primary"
        >
          {(Object.keys(MATCH_LABELS) as MatchType[]).map((k) => (
            <option key={k} value={k}>{MATCH_LABELS[k]}</option>
          ))}
        </select>
      </Field>

      <Field label="Address">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
          className="w-full px-3 py-2 rounded-md border border-kite-border bg-kite-bg font-mono text-sm focus:outline-none focus:border-kite-primary"
        />
      </Field>

      <Field label="Min value (wei, optional)">
        <input
          value={minValueWei}
          onChange={(e) => setMinValueWei(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 1000000000000000000 = 1 KITE"
          className="w-full px-3 py-2 rounded-md border border-kite-border bg-kite-bg font-mono text-sm focus:outline-none focus:border-kite-primary"
        />
      </Field>

      <Field label="Webhook URL">
        <input
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="https://example.com/hooks/kite"
          className="w-full px-3 py-2 rounded-md border border-kite-border bg-kite-bg font-mono text-sm focus:outline-none focus:border-kite-primary"
        />
      </Field>

      <button
        type="submit"
        disabled={!valid || busy}
        className="h-10 px-5 rounded-md bg-kite-primary text-white text-sm font-medium hover:bg-[#8a755a] disabled:opacity-40 transition-colors"
      >
        {busy ? "Saving…" : "Create rule"}
      </button>
      {err && <p className="text-xs text-kite-destructive font-mono">{err}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold tracking-widest uppercase text-kite-fg/55 mb-1">{label}</span>
      {children}
    </label>
  );
}
