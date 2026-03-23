export type ModelTier = "fast" | "reasoning";

export interface RouterDecision {
  model: ModelTier;
  modelId: string;
  reason: string;
}

export const MODELS = {
  fast: "nvidia/nvidia-nemotron-nano-9b-v2",
  reasoning: "nvidia/llama-3.3-nemotron-super-49b-v1",
} as const;

const COMPLEXITY_SIGNALS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  // Multi-process facilities (mentions multiple activities)
  { pattern: /(?:and|with|including|plus|also).*(?:and|with|including|plus|also)/i, weight: 2, label: "multi-process" },
  // CAS number format (chemical specificity)
  { pattern: /\b\d{2,7}-\d{2}-\d\b/, weight: 3, label: "CAS number" },
  // Multiple regulatory domains
  { pattern: /(?:air|water|waste|hazmat|ceqa|stormwater|wastewater)/gi, weight: 1, label: "regulatory terms" },
  // Ambiguous project types
  { pattern: /(?:mixed[\s-]?use|multi[\s-]?purpose|conversion|adaptive[\s-]?reuse|change[\s-]?of[\s-]?use)/i, weight: 2, label: "ambiguous type" },
  // Very short descriptions (need more inference)
  { pattern: /^.{0,50}$/, weight: 2, label: "short description" },
  // Document extraction present
  { pattern: /(?:uploaded|extracted|document|sds|msds|safety data sheet|plan set)/i, weight: 1, label: "document input" },
  // Specific chemical names
  { pattern: /(?:trichloroethylene|perchloroethylene|hexavalent|chromium|benzene|formaldehyde|arsenic|mercury|cadmium|cyanide)/i, weight: 2, label: "specific chemicals" },
  // Multiple locations or jurisdictions
  { pattern: /(?:county line|border|adjacent to|spanning|two cities|multiple)/i, weight: 1, label: "complex jurisdiction" },
];

/**
 * Pre-classification router: decides which model to START with
 * based on complexity signals in the project description.
 */
export function routeClassifier(projectDescription: string): RouterDecision {
  let complexityScore = 0;
  const matchedSignals: string[] = [];

  for (const signal of COMPLEXITY_SIGNALS) {
    const matches = projectDescription.match(signal.pattern);
    if (matches) {
      const count = Array.isArray(matches) ? Math.min(matches.length, 3) : 1;
      complexityScore += signal.weight * count;
      matchedSignals.push(signal.label);
    }
  }

  if (complexityScore >= 5) {
    return {
      model: "reasoning",
      modelId: MODELS.reasoning,
      reason: `High complexity (score ${complexityScore}, signals: ${matchedSignals.join(", ")}): starting with Super 49B`,
    };
  }

  return {
    model: "fast",
    modelId: MODELS.fast,
    reason: `Standard complexity (score ${complexityScore}): starting with Nano 9B`,
  };
}

/**
 * Post-classification router: decides if the classification should be
 * re-run with a stronger model due to low confidence.
 */
export function shouldEscalate(
  classification: Record<string, unknown>,
  currentModel: ModelTier,
): { escalate: boolean; reason: string } {
  if (currentModel === "reasoning") {
    return { escalate: false, reason: "Already at max model tier" };
  }

  const triggers: string[] = [];

  if (classification.confidence === "low") {
    triggers.push("low confidence");
  }
  if (classification.sic_code === "9999") {
    triggers.push("unclassified SIC (9999)");
  }
  if (classification.sic_code === "3999") {
    triggers.push("generic manufacturing NEC (3999)");
  }
  if (!classification.city) {
    triggers.push("no city identified");
  }

  const emissionsProfile = classification.emissions_profile as Record<string, unknown> | undefined;
  if (
    emissionsProfile &&
    Array.isArray(emissionsProfile.likely_air_pollutants) &&
    emissionsProfile.likely_air_pollutants.length === 0 &&
    classification.involves_hazmat === true
  ) {
    triggers.push("hazmat flagged but no emissions identified");
  }

  const shouldEscalate = triggers.length >= 2;
  return {
    escalate: shouldEscalate,
    reason: shouldEscalate
      ? `Escalating to Super 49B: ${triggers.join(", ")}`
      : triggers.length > 0
        ? `Minor concerns (${triggers.join(", ")}) but not enough to escalate`
        : "Classification looks solid",
  };
}

/**
 * Reasoner model selection: always uses the reasoning model.
 */
export function routeReasoner(): RouterDecision {
  return {
    model: "reasoning",
    modelId: MODELS.reasoning,
    reason: "Permit reasoning always uses Super 49B for accuracy",
  };
}

/**
 * Synthesizer model selection: always uses the fast model.
 */
export function routeSynthesizer(): RouterDecision {
  return {
    model: "fast",
    modelId: MODELS.fast,
    reason: "Synthesis uses Nano 9B for speed",
  };
}
