interface SICLookupInput {
  project_type: string;
  has_manufacturing?: boolean;
  has_chemical_processes?: boolean;
}

interface SICLookupResult {
  sic_code: string;
  description: string;
  scaqmd_regulated: boolean;
  igp_regulated: boolean;
  pretreatment_category: string | null;
  category_range: string;
}

const SIC_DATABASE: Record<string, { code: string; description: string; scaqmd: boolean; igp: boolean; pretreatment: string | null }> = {
  "food": { code: "2099", description: "Food Preparations, NEC", scaqmd: true, igp: true, pretreatment: "40 CFR 408" },
  "food manufacturing": { code: "2099", description: "Food Preparations, NEC", scaqmd: true, igp: true, pretreatment: "40 CFR 408" },
  "food processing": { code: "2037", description: "Frozen Fruits, Fruit Juices, and Vegetables", scaqmd: true, igp: true, pretreatment: "40 CFR 408" },
  "bakery": { code: "2051", description: "Bread and Bakery Products", scaqmd: true, igp: true, pretreatment: null },
  "brewery": { code: "2082", description: "Malt Beverages", scaqmd: true, igp: true, pretreatment: "40 CFR 407" },
  "chemical": { code: "2899", description: "Chemicals and Chemical Preparations, NEC", scaqmd: true, igp: true, pretreatment: "40 CFR 415" },
  "chemical manufacturing": { code: "2819", description: "Industrial Inorganic Chemicals, NEC", scaqmd: true, igp: true, pretreatment: "40 CFR 415" },
  "paint": { code: "2851", description: "Paints, Varnishes, Lacquers, Enamels", scaqmd: true, igp: true, pretreatment: "40 CFR 433" },
  "plastics": { code: "3089", description: "Plastics Products Manufacturing, NEC", scaqmd: true, igp: true, pretreatment: null },
  "metal fabrication": { code: "3499", description: "Metal Services, NEC", scaqmd: true, igp: true, pretreatment: "40 CFR 433" },
  "metal finishing": { code: "3471", description: "Electroplating, Plating, Polishing", scaqmd: true, igp: true, pretreatment: "40 CFR 433" },
  "electronics": { code: "3672", description: "Printed Circuit Boards", scaqmd: true, igp: true, pretreatment: "40 CFR 469" },
  "electronics assembly": { code: "3672", description: "Printed Circuit Boards", scaqmd: true, igp: true, pretreatment: "40 CFR 469" },
  "semiconductor": { code: "3674", description: "Semiconductors and Related Devices", scaqmd: true, igp: true, pretreatment: "40 CFR 469" },
  "auto manufacturing": { code: "3711", description: "Motor Vehicles and Passenger Car Bodies", scaqmd: true, igp: true, pretreatment: null },
  "auto body": { code: "7532", description: "Top, Body, and Upholstery Repair Shops", scaqmd: true, igp: false, pretreatment: null },
  "auto repair": { code: "7538", description: "General Automotive Repair Shops", scaqmd: true, igp: false, pretreatment: null },
  "battery": { code: "3692", description: "Primary Batteries, Dry and Wet", scaqmd: true, igp: true, pretreatment: "40 CFR 461" },
  "battery recycling": { code: "5093", description: "Scrap and Waste Materials", scaqmd: true, igp: true, pretreatment: "40 CFR 461" },
  "ev battery": { code: "5093", description: "Scrap and Waste Materials — Battery Recycling", scaqmd: true, igp: true, pretreatment: "40 CFR 461" },
  "recycling": { code: "5093", description: "Scrap and Waste Materials", scaqmd: true, igp: true, pretreatment: null },
  "waste": { code: "4953", description: "Refuse Systems", scaqmd: true, igp: true, pretreatment: null },
  "landfill": { code: "4953", description: "Refuse Systems", scaqmd: true, igp: true, pretreatment: null },
  "residential": { code: "1522", description: "General Contractors — Residential", scaqmd: false, igp: false, pretreatment: null },
  "apartment": { code: "1522", description: "General Contractors — Residential Buildings", scaqmd: false, igp: false, pretreatment: null },
  "commercial construction": { code: "1542", description: "General Contractors — Nonresidential Buildings", scaqmd: false, igp: false, pretreatment: null },
  "warehouse": { code: "4226", description: "Special Warehousing and Storage, NEC", scaqmd: false, igp: false, pretreatment: null },
  "warehouse conversion": { code: "4226", description: "Special Warehousing and Storage, NEC", scaqmd: false, igp: false, pretreatment: null },
  "restaurant": { code: "5812", description: "Eating Places", scaqmd: false, igp: false, pretreatment: null },
  "gas station": { code: "5541", description: "Gasoline Service Stations", scaqmd: true, igp: false, pretreatment: null },
  "dry cleaner": { code: "7216", description: "Drycleaning Plants, Except Rug Cleaning", scaqmd: true, igp: false, pretreatment: null },
  "hospital": { code: "8062", description: "General Medical and Surgical Hospitals", scaqmd: true, igp: false, pretreatment: null },
  "power plant": { code: "4911", description: "Electric Services", scaqmd: true, igp: true, pretreatment: null },
  "solar": { code: "3674", description: "Semiconductors and Related Devices", scaqmd: false, igp: false, pretreatment: null },
  "concrete": { code: "3273", description: "Ready-Mixed Concrete", scaqmd: true, igp: true, pretreatment: null },
  "asphalt": { code: "2951", description: "Asphalt Paving Mixtures and Blocks", scaqmd: true, igp: true, pretreatment: null },
  "printing": { code: "2759", description: "Commercial Printing, NEC", scaqmd: true, igp: true, pretreatment: null },
  "pharmaceutical": { code: "2834", description: "Pharmaceutical Preparations", scaqmd: true, igp: true, pretreatment: "40 CFR 439" },
};

export function sicLookup(input: SICLookupInput): SICLookupResult {
  const projectLower = input.project_type.toLowerCase();

  // Try exact match first
  if (SIC_DATABASE[projectLower]) {
    const match = SIC_DATABASE[projectLower];
    return {
      sic_code: match.code,
      description: match.description,
      scaqmd_regulated: match.scaqmd,
      igp_regulated: match.igp,
      pretreatment_category: match.pretreatment,
      category_range: getCategoryRange(match.code),
    };
  }

  // Try partial keyword match
  for (const [key, value] of Object.entries(SIC_DATABASE)) {
    if (projectLower.includes(key) || key.includes(projectLower)) {
      return {
        sic_code: value.code,
        description: value.description,
        scaqmd_regulated: value.scaqmd,
        igp_regulated: value.igp,
        pretreatment_category: value.pretreatment,
        category_range: getCategoryRange(value.code),
      };
    }
  }

  // Try word-level matching
  const words = projectLower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [key, value] of Object.entries(SIC_DATABASE)) {
      if (key.includes(word)) {
        return {
          sic_code: value.code,
          description: value.description,
          scaqmd_regulated: value.scaqmd,
          igp_regulated: value.igp,
          pretreatment_category: value.pretreatment,
          category_range: getCategoryRange(value.code),
        };
      }
    }
  }

  // Default: manufacturing if has_manufacturing flag
  if (input.has_manufacturing) {
    return {
      sic_code: "3999",
      description: "Manufacturing Industries, NEC",
      scaqmd_regulated: true,
      igp_regulated: true,
      pretreatment_category: null,
      category_range: "3000-3999 (Manufacturing)",
    };
  }

  return {
    sic_code: "9999",
    description: "Nonclassifiable Establishments",
    scaqmd_regulated: false,
    igp_regulated: false,
    pretreatment_category: null,
    category_range: "Unclassified",
  };
}

function getCategoryRange(code: string): string {
  const num = parseInt(code);
  if (num >= 100 && num <= 999) return "0100-0999 (Agriculture/Mining)";
  if (num >= 1000 && num <= 1999) return "1000-1999 (Construction)";
  if (num >= 2000 && num <= 2099) return "2000-2099 (Food Products)";
  if (num >= 2100 && num <= 2199) return "2100-2199 (Tobacco)";
  if (num >= 2200 && num <= 2999) return "2200-2999 (Materials/Chemicals)";
  if (num >= 3000 && num <= 3999) return "3000-3999 (Manufacturing)";
  if (num >= 4000 && num <= 4999) return "4000-4999 (Transportation/Utilities)";
  if (num >= 5000 && num <= 5199) return "5000-5199 (Wholesale — Durable Goods)";
  if (num >= 5200 && num <= 5999) return "5200-5999 (Retail Trade)";
  if (num >= 6000 && num <= 6999) return "6000-6999 (Finance/Insurance/Real Estate)";
  if (num >= 7000 && num <= 8999) return "7000-8999 (Services)";
  return "9000-9999 (Public Administration/Other)";
}
