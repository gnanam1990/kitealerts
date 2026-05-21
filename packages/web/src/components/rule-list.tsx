import { Trash2, Power, PowerOff } from "lucide-react";
import { deleteRule, toggleRule, type Rule } from "../lib/api";

interface Props {
  rules: Rule[];
  onChanged: () => void;
}

export function RuleList({ rules, onChanged }: Props) {
  if (!rules.length) {
    return (
      <p className="text-sm text-kite-fg/60 font-mono">
        No rules yet — create your first one above.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className="rounded-xl border border-kite-border bg-kite-card p-4 flex items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-kite-fg truncate">{rule.name}</h3>
              <span className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${
                rule.active
                  ? "bg-kite-accent/15 text-kite-accent border border-kite-accent/30"
                  : "bg-kite-muted text-kite-fg/55 border border-kite-border"
              }`}>
                {rule.active ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-kite-fg/70 break-all">
              {rule.match_type} · {rule.address}
            </p>
            <p className="mt-1 text-xs font-mono text-kite-fg/50 truncate">
              → {rule.webhook_url}
            </p>
            {rule.min_value_wei && (
              <p className="text-xs font-mono text-kite-fg/50">min: {rule.min_value_wei} wei</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={async () => {
                await toggleRule(rule.id);
                onChanged();
              }}
              className="p-1.5 rounded hover:bg-kite-muted text-kite-fg/60 hover:text-kite-fg"
              title={rule.active ? "Pause" : "Resume"}
            >
              {rule.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete rule "${rule.name}"?`)) return;
                await deleteRule(rule.id);
                onChanged();
              }}
              className="p-1.5 rounded hover:bg-kite-destructive/10 text-kite-fg/60 hover:text-kite-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
