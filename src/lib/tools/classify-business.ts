import sicCodesData from "../data/sic-codes.json";

interface SICEntry {
  code: string;
  description: string;
  category: string;
  scaqmd_permit_likely: boolean;
  igp_regulated: boolean;
  pretreatment_category: string | null;
  common_emissions: string[];
  common_waste_streams: string[];
}

interface ClassifyBusinessInput {
  business_activity: string;
  key_processes?: string[];
  is_manufacturing: boolean;
  is_construction: boolean;
  is_commercial_service: boolean;
}

interface ClassifyBusinessResult {
  sic_code: string;
  sic_description: string;
  category: string;
  regulatory_flags: {
    scaqmd_permit_likely: boolean;
    igp_regulated: boolean;
    has_pretreatment_standard: boolean;
    pretreatment_category: string | null;
  };
  common_emissions: string[];
  common_waste_streams: string[];
  confidence: "high" | "medium" | "low";
  alternatives: Array<{ code: string; description: string; score: number }>;
}

const sicCodes = sicCodesData as SICEntry[];

export function classifyBusiness(input: ClassifyBusinessInput): ClassifyBusinessResult {
  const activity = input.business_activity.toLowerCase();
  const activityWords = activity.split(/\s+/).filter(w => w.length > 3);
  const processes = (input.key_processes || []).map(p => p.toLowerCase());

  const scored = sicCodes.map(entry => {
    let baseScore = 0;
    const desc = entry.description.toLowerCase();
    const cat = entry.category.toLowerCase();

    // Word matches in description
    for (const word of activityWords) {
      if (desc.includes(word)) baseScore += 10;
      if (cat.includes(word)) baseScore += 5;
    }

    // Process matches against common emissions/waste
    for (const proc of processes) {
      for (const emission of entry.common_emissions) {
        if (emission.toLowerCase().includes(proc) || proc.includes(emission.toLowerCase().split(" ")[0])) {
          baseScore += 3;
        }
      }
      for (const waste of entry.common_waste_streams) {
        if (waste.toLowerCase().includes(proc) || proc.includes(waste.toLowerCase().split(" ")[0])) {
          baseScore += 3;
        }
      }
    }

    // Category bonuses — only apply when there is at least some semantic match
    let score = baseScore;
    if (baseScore > 0) {
      const codeNum = parseInt(entry.code, 10);
      if (input.is_manufacturing && codeNum >= 2000 && codeNum <= 3999) score += 8;
      if (input.is_construction && codeNum >= 1500 && codeNum <= 1799) score += 8;
      if (input.is_commercial_service && codeNum >= 5000 && codeNum <= 8999) score += 8;
    }

    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      sic_code: "9999",
      sic_description: "Nonclassifiable Establishments",
      category: "Unclassified",
      regulatory_flags: { scaqmd_permit_likely: false, igp_regulated: false, has_pretreatment_standard: false, pretreatment_category: null },
      common_emissions: [],
      common_waste_streams: [],
      confidence: "low",
      alternatives: [],
    };
  }

  const best = scored[0];
  const alternatives = scored
    .slice(1, 4)
    .filter(s => s.score > 0)
    .map(s => ({ code: s.entry.code, description: s.entry.description, score: s.score }));

  const confidence: "high" | "medium" | "low" =
    best.score >= 20 ? "high" : best.score >= 10 ? "medium" : "low";

  // Fallback for unmatched
  if (best.score === 0) {
    let fallbackCode = "9999";
    let fallbackDesc = "Nonclassifiable Establishments";
    let category = "Unclassified";
    let regulatory_flags = {
      scaqmd_permit_likely: false,
      igp_regulated: false,
      has_pretreatment_standard: false,
      pretreatment_category: null as string | null,
    };

    if (input.is_manufacturing) {
      fallbackCode = "3999";
      fallbackDesc = "Manufacturing Industries, NEC";
      category = "Miscellaneous Manufacturing";
      regulatory_flags = { scaqmd_permit_likely: true, igp_regulated: true, has_pretreatment_standard: false, pretreatment_category: null };
    } else if (input.is_construction) {
      fallbackCode = "1542";
      fallbackDesc = "General Contractors — Nonresidential Buildings";
      category = "Building Construction";
      regulatory_flags = { scaqmd_permit_likely: true, igp_regulated: false, has_pretreatment_standard: false, pretreatment_category: null };
    }

    return {
      sic_code: fallbackCode,
      sic_description: fallbackDesc,
      category,
      regulatory_flags,
      common_emissions: [],
      common_waste_streams: [],
      confidence: "low",
      alternatives: [],
    };
  }

  return {
    sic_code: best.entry.code,
    sic_description: best.entry.description,
    category: best.entry.category,
    regulatory_flags: {
      scaqmd_permit_likely: best.entry.scaqmd_permit_likely,
      igp_regulated: best.entry.igp_regulated,
      has_pretreatment_standard: best.entry.pretreatment_category !== null,
      pretreatment_category: best.entry.pretreatment_category,
    },
    common_emissions: best.entry.common_emissions,
    common_waste_streams: best.entry.common_waste_streams,
    confidence,
    alternatives,
  };
}
