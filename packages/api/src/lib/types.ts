export type MatchType =
  | "address_receives"
  | "address_sends"
  | "contract_called";

export interface Rule {
  id: string;
  name: string;
  match_type: MatchType;
  address: string;
  min_value_wei?: string | null;
  webhook_url: string;
  active: 0 | 1;
  created_at: number;
  last_seen_block: number;
}
