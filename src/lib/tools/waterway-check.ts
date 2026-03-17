interface WaterwayCheckInput {
  location_description: string;
  area_of_county?: string;
}

interface WaterwayCheckResult {
  nearest_waterbody: string | null;
  distance_category: "adjacent" | "within_500ft" | "within_1mi" | "none_identified";
  impairments: string[];
  nal_monitoring_required: boolean;
  agency_jurisdiction: string;
  tmdl_applies: boolean;
  additional_bmps_required: boolean;
}

interface WaterbodyData {
  name: string;
  impairments: string[];
  drainage_area: string[];
  keywords: string[];
  tmdl: boolean;
}

const LA_COUNTY_303D_WATERBODIES: WaterbodyData[] = [
  {
    name: "Los Angeles River",
    impairments: ["metals (copper, lead, zinc)", "bacteria (E. coli)", "nutrients (nitrogen, phosphorus)", "trash", "ammonia"],
    drainage_area: ["San Fernando Valley", "Glendale", "Burbank", "Downtown", "Vernon", "South Gate", "Compton", "Long Beach", "Atwater Village", "Elysian Valley"],
    keywords: ["la river", "los angeles river", "river", "san fernando", "downtown", "vernon", "south gate"],
    tmdl: true,
  },
  {
    name: "Dominguez Channel",
    impairments: ["copper", "zinc", "lead", "bacteria (E. coli, enterococcus)", "toxicity"],
    drainage_area: ["South Bay", "Torrance", "Carson", "Wilmington", "Harbor City", "Gardena", "Hawthorne", "Lawndale", "Compton"],
    keywords: ["dominguez", "south bay", "torrance", "carson", "harbor", "wilmington", "gardena"],
    tmdl: true,
  },
  {
    name: "Ballona Creek",
    impairments: ["metals (copper, lead, zinc, silver)", "bacteria", "toxics (DDT, PCBs, chlordane)", "trash"],
    drainage_area: ["Westside", "West LA", "Culver City", "Baldwin Hills", "Mar Vista", "Playa Del Rey", "Marina Del Rey"],
    keywords: ["ballona", "westside", "west la", "culver", "baldwin", "marina", "playa"],
    tmdl: true,
  },
  {
    name: "San Gabriel River",
    impairments: ["bacteria (E. coli)", "metals (copper, lead, zinc)", "cyanide"],
    drainage_area: ["San Gabriel Valley", "Azusa", "Irwindale", "El Monte", "Whittier", "Pico Rivera", "Downey", "Lakewood", "Long Beach", "Seal Beach"],
    keywords: ["san gabriel", "azusa", "irwindale", "el monte", "whittier", "pico rivera", "downey", "lakewood"],
    tmdl: true,
  },
  {
    name: "Compton Creek",
    impairments: ["metals (copper, lead, zinc)", "bacteria", "trash"],
    drainage_area: ["Compton", "Willowbrook", "Lynwood", "Paramount"],
    keywords: ["compton", "willowbrook", "lynwood", "paramount"],
    tmdl: true,
  },
  {
    name: "Santa Monica Bay",
    impairments: ["DDT", "PCBs", "bacteria", "debris"],
    drainage_area: ["Santa Monica", "Malibu", "Pacific Palisades", "Venice", "El Segundo", "Manhattan Beach", "Hermosa Beach", "Redondo Beach"],
    keywords: ["santa monica", "malibu", "venice", "beach", "bay", "coast", "ocean"],
    tmdl: true,
  },
  {
    name: "Long Beach Harbor / San Pedro Bay",
    impairments: ["copper", "zinc", "lead", "PAHs", "DDT", "PCBs", "bacteria"],
    drainage_area: ["Long Beach", "San Pedro", "Terminal Island", "Port of Long Beach", "Port of LA"],
    keywords: ["long beach", "san pedro", "port", "harbor", "terminal island"],
    tmdl: true,
  },
  {
    name: "Machado Lake",
    impairments: ["nutrients (nitrogen, phosphorus)", "trash", "odors", "algae"],
    drainage_area: ["Harbor City", "Wilmington", "Ken Malloy Harbor Regional Park"],
    keywords: ["machado", "harbor city", "harbor regional"],
    tmdl: true,
  },
  {
    name: "Rio Hondo",
    impairments: ["metals", "bacteria", "nutrients"],
    drainage_area: ["Montebello", "Pico Rivera", "South El Monte", "Whittier Narrows"],
    keywords: ["rio hondo", "montebello", "whittier narrows"],
    tmdl: true,
  },
];

export function waterwayCheck(input: WaterwayCheckInput): WaterwayCheckResult {
  const locLower = input.location_description.toLowerCase();
  const areaLower = (input.area_of_county || "").toLowerCase();
  const combined = `${locLower} ${areaLower}`;

  // Check for explicit mentions of waterways or water features
  const waterKeywords = ["channel", "creek", "river", "stream", "wash", "drain", "waterway", "waterbody", "lake", "harbor", "bay", "ocean", "coast"];
  const mentionsWater = waterKeywords.some((kw) => combined.includes(kw));

  // Find matching waterbody
  let bestMatch: WaterbodyData | null = null;
  let matchScore = 0;

  for (const wb of LA_COUNTY_303D_WATERBODIES) {
    let score = 0;
    for (const kw of wb.keywords) {
      if (combined.includes(kw)) score += 2;
    }
    for (const area of wb.drainage_area) {
      if (combined.includes(area.toLowerCase())) score += 3;
    }
    if (combined.includes(wb.name.toLowerCase())) score += 5;

    if (score > matchScore) {
      matchScore = score;
      bestMatch = wb;
    }
  }

  if (!bestMatch && !mentionsWater) {
    return {
      nearest_waterbody: null,
      distance_category: "none_identified",
      impairments: [],
      nal_monitoring_required: false,
      agency_jurisdiction: "LA RWQCB Region 4",
      tmdl_applies: false,
      additional_bmps_required: false,
    };
  }

  if (bestMatch) {
    const isAdjacent = mentionsWater || combined.includes("near") || combined.includes("next to") || combined.includes("adjacent");
    return {
      nearest_waterbody: bestMatch.name,
      distance_category: isAdjacent ? "adjacent" : "within_1mi",
      impairments: bestMatch.impairments,
      nal_monitoring_required: true,
      agency_jurisdiction: "LA RWQCB Region 4 / US Army Corps of Engineers (if waters of the US)",
      tmdl_applies: bestMatch.tmdl,
      additional_bmps_required: true,
    };
  }

  return {
    nearest_waterbody: "Unidentified drainage channel",
    distance_category: "within_500ft",
    impairments: ["Unknown — site-specific assessment required"],
    nal_monitoring_required: true,
    agency_jurisdiction: "LA RWQCB Region 4",
    tmdl_applies: false,
    additional_bmps_required: true,
  };
}
