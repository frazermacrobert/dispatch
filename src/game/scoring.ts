
import { ActiveBrief, Consultant, StatKey, Stats } from "./types";
import { randomBetween, pickClientName } from "./util";

export const createBriefInstance = (
  archetype: ActiveBrief | any,
  index: number
): ActiveBrief => {
  const limit = randomBetween(8000, 12000);
  return {
    ...archetype,
    id: `${archetype.id}-${index}`,
    instanceIndex: index,
    clientName: pickClientName(),
    remainingMs: limit,
    timeLimitMs: limit,
    status: "pending",
    mapX: Math.random() * 80 + 10,
    mapY: Math.random() * 60 + 10
  };
};

export const evaluateMissionOutcome = (
  brief: ActiveBrief,
  team: Consultant[]
): { success: boolean; explanation: string } => {
  const successChance = 0.5; 
  const success = Math.random() < successChance;
  return {
    success,
    explanation: success
      ? "Team matched reasonably well."
      : "Team lacked required profile."
  };
};
