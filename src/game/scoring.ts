import { ActiveBrief, Consultant, Stats } from "./types";
import * as turf from "@turf/turf";

const STAT_KEYS: Array<keyof Stats> = [
  "charisma",
  "intelligence",
  "speed",
  "strategy",
  "innovation",
];

// Create a pentagon polygon from 5-axis stats
function statsToPolygon(stats: Stats): turf.Feature<turf.Polygon> {
  const center = [0, 0];
  const coords: number[][] = [];
  
  const angleStep = (2 * Math.PI) / 5;
  
  STAT_KEYS.forEach((key, i) => {
    const angle = i * angleStep - Math.PI / 2; // Start at top
    const radius = stats[key];
    const x = center[0] + radius * Math.cos(angle);
    const y = center[1] + radius * Math.sin(angle);
    coords.push([x, y]);
  });
  
  // Close the polygon
  coords.push(coords[0]);
  
  return turf.polygon([coords]);
}

// Combine multiple consultants' stats by summing each axis
function combineStats(consultants: Consultant[]): Stats {
  const combined: Stats = {
    charisma: 0,
    intelligence: 0,
    speed: 0,
    strategy: 0,
    innovation: 0,
  };
  
  consultants.forEach((c) => {
    STAT_KEYS.forEach((key) => {
      combined[key] += c.stats[key];
    });
  });
  
  return combined;
}

// Generate random point inside a polygon
function randomPointInPolygon(
  poly: turf.Feature<turf.Polygon>
): [number, number] {
  const bbox = turf.bbox(poly);
  let attempts = 0;
  const maxAttempts = 1000;
  
  while (attempts < maxAttempts) {
    const x = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
    const y = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
    const pt = turf.point([x, y]);
    
    if (turf.booleanPointInPolygon(pt, poly)) {
      return [x, y];
    }
    attempts++;
  }
  
  // Fallback to centroid
  const centroid = turf.centroid(poly);
  return centroid.geometry.coordinates as [number, number];
}

export function evaluateMissionOutcome(
  brief: ActiveBrief,
  team: Consultant[]
): { success: boolean; explanation: string } {
  const teamStats = combineStats(team);
  const teamPoly = statsToPolygon(teamStats);
  const missionPoly = statsToPolygon(brief.requirements);
  
  // Check for auto-win consultant
  const hasAutoWin = brief.autoWinConsultantId
    ? team.some((c) => c.id === brief.autoWinConsultantId)
    : false;
  
  // Apply auto-win boost (slightly expand team polygon)
  let testPoly = teamPoly;
  if (hasAutoWin) {
    const boosted: Stats = { ...teamStats };
    STAT_KEYS.forEach((key) => {
      boosted[key] = Math.min(boosted[key] * 1.15, 50); // 15% boost, cap at 50
    });
    testPoly = statsToPolygon(boosted);
  }
  
  let explanation = "";
  
  try {
    // Calculate intersection
    const intersection = turf.intersect(
      turf.featureCollection([testPoly, missionPoly])
    );
    
    if (!intersection) {
      return {
        success: false,
        explanation: "Team skills don't overlap with mission requirements at all.",
      };
    }
    
    const intersectionArea = turf.area(intersection);
    const missionArea = turf.area(missionPoly);
    const overlapPercent = (intersectionArea / missionArea) * 100;
    
    // Random point test inside mission polygon
    const randomPoint = randomPointInPolygon(missionPoly);
    const testPoint = turf.point(randomPoint);
    const pointInIntersection = turf.booleanPointInPolygon(testPoint, intersection);
    
    explanation = `Team coverage: ${overlapPercent.toFixed(1)}%. `;
    
    if (hasAutoWin) {
      explanation += `${team.find((c) => c.id === brief.autoWinConsultantId)?.name} provided expert advantage. `;
    }
    
    if (pointInIntersection) {
      explanation += "Random mission requirement fell within team capabilities.";
      return { success: true, explanation };
    } else {
      explanation += "Random mission requirement fell outside team capabilities.";
      return { success: false, explanation };
    }
  } catch (error) {
    // Fallback if geometry calculation fails
    const teamTotal = Object.values(teamStats).reduce((a, b) => a + b, 0);
    const missionTotal = Object.values(brief.requirements).reduce((a, b) => a + b, 0);
    const ratio = teamTotal / missionTotal;
    
    const success = hasAutoWin ? ratio > 0.7 : ratio > 0.9;
    
    return {
      success,
      explanation: hasAutoWin
        ? "Auto-win consultant provided advantage."
        : success
        ? "Team appears adequate."
        : "Team appears under-equipped.",
    };
  }
}

export function createBriefInstance(
  archetype: any,
  index: number
): ActiveBrief {
  const clientNames = [
    "NovaTech Group",
    "Lumen Energy",
    "Harbour Collective",
    "Northwind Retail",
    "Beacon plc",
    "Vertex Holdings",
    "Meridian Corp",
    "Atlas Industries",
    "Zenith Systems",
    "Cornerstone Ltd",
  ];
  
  const timeLimitMs = 8000 + Math.random() * 4000; // 8-12 seconds
  
  return {
    ...archetype,
    id: `${archetype.id}-${index}`,
    instanceIndex: index,
    clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
    remainingMs: timeLimitMs,
    timeLimitMs,
    status: "pending",
    mapX: 15 + Math.random() * 70,
    mapY: 15 + Math.random() * 70,
  };
}
