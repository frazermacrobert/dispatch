import { StatKey } from "./constants";

export interface Stats {
  Flamboyance: number;
  Process: number;
  Pace: number;
  Tenure: number;
  Madcap: number;
}

export type ConsultantState = "available" | "selected" | "cooldown";

export interface Consultant {
  id: string;
  name: string;
  tag: string;
  avatar?: string;
  stats: Stats;
  state: ConsultantState;
  cooldownMs?: number;
}

export interface BriefArchetype {
  id: string;
  name: string;
  description: string;
  difficultyLabel: string;
  requirements: Stats;
  minConsultants: number;
  maxConsultants: number;
  autoWinConsultantId?: string;
  clue?: string;
}

export type BriefStatus = "pending" | "success" | "failed";

export interface ActiveBrief extends BriefArchetype {
  instanceIndex: number;
  id: string;
  clientName: string;
  remainingMs: number;
  timeLimitMs: number;
  status: BriefStatus;
  mapX: number;
  mapY: number;
}
