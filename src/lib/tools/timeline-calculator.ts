import { PermitDetermination } from "../types";

interface DependencyLookupInput {
  permit_name: string;
  agency: string;
}

interface DependencyResult {
  permit_name: string;
  prerequisites: string[];
  can_parallel_with: string[];
  dependency_reasoning: string;
}

const DEPENDENCY_MAP: Record<string, { prerequisites: string[]; parallel: string[] }> = {
  "CEQA": {
    prerequisites: [],
    parallel: ["HMBP", "Rule 403 Dust Control Plan", "CGP NOI", "EPA ID Number"],
  },
  "Permit to Construct": {
    prerequisites: ["CEQA"],
    parallel: ["IGP NOI", "IWDP", "HMBP"],
  },
  "Permit to Operate": {
    prerequisites: ["Permit to Construct"],
    parallel: [],
  },
  "Health Risk Assessment": {
    prerequisites: [],
    parallel: ["CEQA", "HMBP", "IGP NOI"],
  },
  "IGP NOI": {
    prerequisites: [],
    parallel: ["CEQA", "HMBP", "IWDP", "CGP NOI"],
  },
  "CGP NOI": {
    prerequisites: [],
    parallel: ["CEQA", "HMBP", "IGP NOI"],
  },
  "IWDP": {
    prerequisites: [],
    parallel: ["CEQA", "IGP NOI", "HMBP"],
  },
  "Section 404 Permit": {
    prerequisites: ["CEQA"],
    parallel: ["Section 1602 Agreement"],
  },
  "Section 1602 Agreement": {
    prerequisites: ["CEQA"],
    parallel: ["Section 404 Permit"],
  },
  "HMBP": {
    prerequisites: [],
    parallel: ["CEQA", "IGP NOI", "IWDP", "CGP NOI"],
  },
  "EPA ID Number": {
    prerequisites: [],
    parallel: ["HMBP", "CEQA", "everything"],
  },
  "Rule 403 Dust Control Plan": {
    prerequisites: [],
    parallel: ["everything"],
  },
};

export function dependencyLookup(input: DependencyLookupInput): DependencyResult {
  // Normalize permit name for lookup
  const permitLower = input.permit_name.toLowerCase();

  for (const [key, value] of Object.entries(DEPENDENCY_MAP)) {
    if (permitLower.includes(key.toLowerCase()) || key.toLowerCase().includes(permitLower)) {
      return {
        permit_name: input.permit_name,
        prerequisites: value.prerequisites,
        can_parallel_with: value.parallel,
        dependency_reasoning: value.prerequisites.length > 0
          ? `${input.permit_name} requires ${value.prerequisites.join(", ")} to be completed first. Can run in parallel with: ${value.parallel.join(", ")}.`
          : `${input.permit_name} has no prerequisites and can be filed immediately. Can run in parallel with: ${value.parallel.join(", ")}.`,
      };
    }
  }

  return {
    permit_name: input.permit_name,
    prerequisites: [],
    can_parallel_with: [],
    dependency_reasoning: `No dependency data found for ${input.permit_name}. Assume it can be filed independently.`,
  };
}

export function calculateTimeline(permits: PermitDetermination[]): {
  total_months: number;
  parallel_tracks: string[][];
  critical_path: string[];
  sequence: string[];
} {
  const required = permits.filter((p) => p.required);
  if (required.length === 0) {
    return { total_months: 0, parallel_tracks: [], critical_path: [], sequence: [] };
  }

  // Group into tracks
  const immediate: string[] = [];
  const postCeqa: string[] = [];
  const postConstruct: string[] = [];
  let ceqaWeeks = 0;

  for (const permit of required) {
    const name = permit.permit_name;
    const deps = DEPENDENCY_MAP[name];

    if (name.includes("CEQA") || name.includes("Negative Declaration") || name.includes("EIR")) {
      ceqaWeeks = permit.timeline_weeks;
      immediate.push(name);
    } else if (deps?.prerequisites.includes("CEQA")) {
      postCeqa.push(name);
    } else if (deps?.prerequisites.includes("Permit to Construct")) {
      postConstruct.push(name);
    } else {
      immediate.push(name);
    }
  }

  const sequence = [...immediate, ...postCeqa, ...postConstruct];
  const maxImmediateWeeks = Math.max(...required.filter((p) => immediate.includes(p.permit_name)).map((p) => p.timeline_weeks), 0);
  const maxPostCeqaWeeks = Math.max(...required.filter((p) => postCeqa.includes(p.permit_name)).map((p) => p.timeline_weeks), 0);
  const maxPostConstructWeeks = Math.max(...required.filter((p) => postConstruct.includes(p.permit_name)).map((p) => p.timeline_weeks), 0);

  const totalWeeks = Math.max(maxImmediateWeeks, ceqaWeeks) + maxPostCeqaWeeks + maxPostConstructWeeks;

  // Critical path is the longest sequential chain
  const criticalPath: string[] = [];
  if (ceqaWeeks > 0) criticalPath.push(required.find((p) => p.permit_name.includes("CEQA") || p.permit_name.includes("Declaration") || p.permit_name.includes("EIR"))?.permit_name || "CEQA Review");
  if (postCeqa.length > 0) {
    const longest = required.filter((p) => postCeqa.includes(p.permit_name)).sort((a, b) => b.timeline_weeks - a.timeline_weeks)[0];
    if (longest) criticalPath.push(longest.permit_name);
  }
  if (postConstruct.length > 0) {
    const longest = required.filter((p) => postConstruct.includes(p.permit_name)).sort((a, b) => b.timeline_weeks - a.timeline_weeks)[0];
    if (longest) criticalPath.push(longest.permit_name);
  }

  return {
    total_months: Math.ceil(totalWeeks / 4.33),
    parallel_tracks: [immediate, postCeqa, postConstruct].filter((t) => t.length > 0),
    critical_path: criticalPath,
    sequence,
  };
}
