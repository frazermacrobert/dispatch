
export const STAT_KEYS = ["Flamboyance", "Process", "Pace", "Tenure", "Madcap"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  Flamboyance: "🔥",
  Process: "⚙️",
  Pace: "👟",
  Tenure: "🕰️",
  Madcap: "🤪",
};
