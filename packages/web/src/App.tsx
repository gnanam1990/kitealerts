import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { RuleForm } from "./components/rule-form";
import { RuleList } from "./components/rule-list";
import { PreviewBadge } from "./components/preview-badge";
import { listRules, type Rule } from "./lib/api";

export default function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setRules(await listRules());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-kite-primary mb-1">
            v0.1 · Webhook-only delivery
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-kite-fg">
            Get pinged when Kite addresses move.
          </h1>
          <p className="mt-2 text-sm text-kite-fg/70 max-w-2xl">
            Each rule polls KiteScan every 30 seconds and POSTs matching transactions to your
            webhook. Discord / Telegram / email delivery: <PreviewBadge>v0.2</PreviewBadge>.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,1.4fr] gap-6">
          <RuleForm onCreated={refresh} />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-kite-fg">Rules</h2>
              <button
                onClick={refresh}
                className="text-xs font-semibold text-kite-fg/55 hover:text-kite-fg transition-colors"
              >
                Refresh
              </button>
            </div>
            {loading ? (
              <p className="text-sm font-mono text-kite-fg/55">Loading…</p>
            ) : error ? (
              <p className="text-sm font-mono text-kite-destructive">{error}</p>
            ) : (
              <RuleList rules={rules} onChanged={refresh} />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
