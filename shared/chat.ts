export type ChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type ChatExperimentContext = {
  id: string;
  test_id: string;
  material: string;
  investigation: string | null;
  thickness_mm: number | null;
  width_mm: number | null;
  flow_direction: string | null;
  flow_initial_cm_s: number | null;
  flow_final_cm_s: number | null;
  flow_as_recorded: string | null;
  flow_change_cm_s: number | null;
  flow_ratio: number | null;
  oxygen_vol_pct: number | null;
  pressure_kpa: number | null;
  outcome: string | null;
  outcome_label: string | null;
  outcome_status: "recorded" | "unspecified" | "unknown";
  nasa_notes: string | null;
  source_id: string | null;
  pdf_page: number | null;
  source_csv_pressure_range_kpa: string | null;
  source_url: string | null;
};

export type ChatRequest = {
  sessionId: string;
  message: string;
  history: ChatHistoryEntry[];
  experiments: ChatExperimentContext[];
};

export type ChatReply = {
  reply: string;
};

export const CHAT_MESSAGE_MAX = 4000;
export const CHAT_HISTORY_MAX = 12;
